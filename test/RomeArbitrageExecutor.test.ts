import { expect } from "chai";
import { ethers } from "hardhat";
import {
  RomeArbitrageExecutor,
  MockRomeCPI,
  MockRomeHelper,
  MockERC20,
  MockEvmRouter,
} from "../typechain-types";

describe("RomeArbitrageExecutor (Dual-VM Atomic Arbitrage)", function () {
  let executor: RomeArbitrageExecutor;
  let mockCpi: MockRomeCPI;
  let mockHelper: MockRomeHelper;
  let mockUsdc: MockERC20;
  let mockSol: MockERC20;
  let mockRouter: MockEvmRouter;

  let owner: any;
  let keeper: any;
  let unauthorized: any;

  const INITIAL_VAULT_USDC = ethers.parseUnits("1000", 6); // 1,000 USDC
  const TRADE_AMOUNT = ethers.parseUnits("100", 6);        // 100 USDC

  beforeEach(async function () {
    [owner, keeper, unauthorized] = await ethers.getSigners();

    // 1. Deploy Mocks
    const MockRomeCPIFactory = await ethers.getContractFactory("MockRomeCPI");
    mockCpi = await MockRomeCPIFactory.deploy();

    const MockRomeHelperFactory = await ethers.getContractFactory("MockRomeHelper");
    mockHelper = await MockRomeHelperFactory.deploy();

    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockUsdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
    mockSol = await MockERC20Factory.deploy("Wrapped SOL", "wSOL", 9);

    const MockEvmRouterFactory = await ethers.getContractFactory("MockEvmRouter");
    mockRouter = await MockEvmRouterFactory.deploy();

    // 2. Deploy RomeArbitrageExecutor with mock precompiles
    const RomeArbitrageExecutorFactory = await ethers.getContractFactory("RomeArbitrageExecutor");
    executor = await RomeArbitrageExecutorFactory.deploy(
      await mockCpi.getAddress(),
      await mockHelper.getAddress()
    );

    // 3. Setup Keeper
    await executor.setKeeper(keeper.address, true);

    // 4. Fund Vault with initial capital
    await mockUsdc.mint(await executor.getAddress(), INITIAL_VAULT_USDC);
  });

  describe("Deployment & Configuration", function () {
    it("should set owner and initial keeper correctly", async function () {
      expect(await executor.owner()).to.equal(owner.address);
      expect(await executor.isKeeper(owner.address)).to.be.true;
      expect(await executor.isKeeper(keeper.address)).to.be.true;
      expect(await executor.isKeeper(unauthorized.address)).to.be.false;
    });

    it("should set precompile interfaces correctly", async function () {
      expect(await executor.cpiProgram()).to.equal(await mockCpi.getAddress());
      expect(await executor.helperProgram()).to.equal(await mockHelper.getAddress());
    });

    it("should allow owner to update keeper whitelist", async function () {
      await expect(executor.setKeeper(unauthorized.address, true))
        .to.emit(executor, "KeeperUpdated")
        .withArgs(unauthorized.address, true);

      expect(await executor.isKeeper(unauthorized.address)).to.be.true;

      await executor.setKeeper(unauthorized.address, false);
      expect(await executor.isKeeper(unauthorized.address)).to.be.false;
    });

    it("should reject non-owner from updating keepers", async function () {
      await expect(
        executor.connect(unauthorized).setKeeper(unauthorized.address, true)
      ).to.be.revertedWith("RomeArbitrage: Caller is not owner");
    });
  });

  describe("Atomic Cross-Market Arbitrage Execution", function () {
    it("should execute profitable arbitrage atomically and emit ArbitrageExecuted", async function () {
      const executorAddress = await executor.getAddress();
      const profitUsdc = ethers.parseUnits("5", 6); // 5 USDC profit

      // Configure Mock CPI to simulate receiving 5 USDC profit during execution
      await mockCpi.setSimulation(
        await mockUsdc.getAddress(),
        executorAddress,
        profitUsdc,
        false
      );

      // Dummy Solana Program ID (32 bytes)
      const mockSolanaProgramId = ethers.encodeBytes32String("METEORA_DAMM_PROG");
      const mockInstructionData = "0xf8c69e91e17587c800000000";

      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress, // Direct Solana leg for test
        evmSwapData: "0x",
        solanaProgramId: mockSolanaProgramId,
        solanaAccounts: [],
        solanaInstructionData: mockInstructionData,
        salts: [],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: TRADE_AMOUNT,
        minProfit: ethers.parseUnits("1", 6), // require >= 1 USDC profit
      };

      const tx = await executor.connect(keeper).executeAtomicArbitrage(arbitrageParams);

      await expect(tx)
        .to.emit(executor, "ArbitrageExecuted");

      // Verify final balance increased
      const finalBalance = await mockUsdc.balanceOf(executorAddress);
      expect(finalBalance).to.equal(INITIAL_VAULT_USDC + profitUsdc);

      // Verify mock CPI was invoked
      expect(await mockCpi.invokeCount()).to.equal(1);
    });

    it("should invoke signed CPI when salts are supplied", async function () {
      const executorAddress = await executor.getAddress();
      const profitUsdc = ethers.parseUnits("2", 6);

      await mockCpi.setSimulation(
        await mockUsdc.getAddress(),
        executorAddress,
        profitUsdc,
        false
      );

      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt_1"));
      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress,
        evmSwapData: "0x",
        solanaProgramId: ethers.encodeBytes32String("SOLANA_PDA_SWAP"),
        solanaAccounts: [],
        solanaInstructionData: "0x1234",
        salts: [salt],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: TRADE_AMOUNT,
        minProfit: ethers.parseUnits("0.5", 6),
      };

      await executor.connect(keeper).executeAtomicArbitrage(arbitrageParams);

      expect(await mockCpi.invokeSignedCount()).to.equal(1);
      expect(await mockCpi.lastSalts(0)).to.equal(salt);
    });

    it("should REVERT completely if net profit < minProfit (Atomicity & Slippage Protection)", async function () {
      const executorAddress = await executor.getAddress();
      // Only 0.2 USDC profit generated
      const smallProfit = ethers.parseUnits("0.2", 6);

      await mockCpi.setSimulation(
        await mockUsdc.getAddress(),
        executorAddress,
        smallProfit,
        false
      );

      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress,
        evmSwapData: "0x",
        solanaProgramId: ethers.encodeBytes32String("METEORA_DAMM"),
        solanaAccounts: [],
        solanaInstructionData: "0x99",
        salts: [],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: TRADE_AMOUNT,
        minProfit: ethers.parseUnits("1.0", 6), // expects at least 1.0 USDC!
      };

      await expect(
        executor.connect(keeper).executeAtomicArbitrage(arbitrageParams)
      ).to.be.revertedWith("Arbitrage: Unprofitable");

      // Balance must remain completely unchanged due to atomic rollback
      const finalBalance = await mockUsdc.balanceOf(executorAddress);
      expect(finalBalance).to.equal(INITIAL_VAULT_USDC);
    });

    it("should REVERT if Solana CPI call fails", async function () {
      await mockCpi.setSimulation(
        await mockUsdc.getAddress(),
        await executor.getAddress(),
        ethers.parseUnits("10", 6),
        true // FORCE CPI FAILURE
      );

      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress,
        evmSwapData: "0x",
        solanaProgramId: ethers.encodeBytes32String("METEORA_DAMM"),
        solanaAccounts: [],
        solanaInstructionData: "0x11",
        salts: [],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: TRADE_AMOUNT,
        minProfit: ethers.parseUnits("1", 6),
      };

      await expect(
        executor.connect(keeper).executeAtomicArbitrage(arbitrageParams)
      ).to.be.revertedWith("MockRomeCPI: Simulated Solana execution failure");
    });

    it("should reject execution from unauthorized callers", async function () {
      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress,
        evmSwapData: "0x",
        solanaProgramId: ethers.encodeBytes32String("METEORA"),
        solanaAccounts: [],
        solanaInstructionData: "0x00",
        salts: [],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: TRADE_AMOUNT,
        minProfit: 0,
      };

      await expect(
        executor.connect(unauthorized).executeAtomicArbitrage(arbitrageParams)
      ).to.be.revertedWith("RomeArbitrage: Unauthorized keeper");
    });
  });

  describe("Caller-Funded Arbitrage (executeArbitrageWithTransfer)", function () {
    it("should pull funds, execute arbitrage, and return principal + profit to keeper", async function () {
      const executorAddress = await executor.getAddress();
      const keeperTradeAmount = ethers.parseUnits("50", 6);
      const profit = ethers.parseUnits("4", 6);

      // Mint tokens to keeper
      await mockUsdc.mint(keeper.address, keeperTradeAmount);
      await mockUsdc.connect(keeper).approve(executorAddress, keeperTradeAmount);

      await mockCpi.setSimulation(
        await mockUsdc.getAddress(),
        executorAddress,
        profit,
        false
      );

      const arbitrageParams = {
        evmRouter: ethers.ZeroAddress,
        evmSwapData: "0x",
        solanaProgramId: ethers.encodeBytes32String("SOLANA_LEG"),
        solanaAccounts: [],
        solanaInstructionData: "0xaa",
        salts: [],
        inputToken: await mockUsdc.getAddress(),
        inputAmount: keeperTradeAmount,
        minProfit: ethers.parseUnits("1", 6),
      };

      await executor.connect(keeper).executeArbitrageWithTransfer(arbitrageParams);

      // Keeper received initial 50 + 4 profit = 54 USDC
      const keeperFinalBalance = await mockUsdc.balanceOf(keeper.address);
      expect(keeperFinalBalance).to.equal(keeperTradeAmount + profit);
    });
  });

  describe("Emergency Rescue Functions", function () {
    it("should allow owner to rescue ERC20 tokens", async function () {
      const rescueAmount = ethers.parseUnits("200", 6);
      await expect(executor.rescueTokens(await mockUsdc.getAddress(), owner.address, rescueAmount))
        .to.emit(executor, "TokensRescued")
        .withArgs(await mockUsdc.getAddress(), owner.address, rescueAmount);

      expect(await mockUsdc.balanceOf(owner.address)).to.equal(rescueAmount);
    });

    it("should allow owner to rescue Solana lamports via helper precompile", async function () {
      const lamports = 1000000;
      await expect(executor.rescueSolanaLamports(owner.address, lamports))
        .to.emit(executor, "LamportsRescued")
        .withArgs(owner.address, lamports);

      expect(await mockHelper.pdaLamports(owner.address)).to.equal(lamports);
    });

    it("should prevent unauthorized accounts from calling rescue", async function () {
      await expect(
        executor.connect(unauthorized).rescueTokens(await mockUsdc.getAddress(), unauthorized.address, 100)
      ).to.be.revertedWith("RomeArbitrage: Caller is not owner");
    });
  });
});
