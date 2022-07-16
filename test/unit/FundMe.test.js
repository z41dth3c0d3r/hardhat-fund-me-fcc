const { assert, expect } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe, mockV3Aggregator, accounts, deployer;
      let sendValue = ethers.utils.parseEther("1");

      beforeEach(async function () {
        accounts = await ethers.getSigners();
        deployer = accounts[0].address;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", async function () {
        it("sets the aggregator address correctly", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });

        it("Updated the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("Adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });

        describe("withdraw", async function () {
          before(async function () {
            await fundMe.fund({ value: sendValue });
          });
        });

        it("Withdraw ETH from a single founder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //   Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //   Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("Withdraw ETH from a single founder using cheaperWithdraw...", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //   Act
          const transactionResponse = await fundMe.cheaper_withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          //   Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        it("allows us to withdraw with multiple funders", async function () {
          // Arrange
          //   get all fake accounts
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          //   get current balance of fundMe contract
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //   get accounts[0]th balance
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          //   withdraw
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          //   calculating gas
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          //   get current balance of fundMe contract
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //   get current balance of accounts[0]
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 0; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("cheapWithdraw test", async function () {
          // Arrange
          //   get all fake accounts
          const accounts = await ethers.getSigners();
          for (let i = 0; i < 6; i++) {
            const fundMeConnectedContract = await fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          //   get current balance of fundMe contract
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //   get accounts[0]th balance
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          //   withdraw
          const transactionResponse = await fundMe.cheaper_withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          //   calculating gas
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          //   get current balance of fundMe contract
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          //   get current balance of accounts[0]
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );

          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 0; i < 6; i++) {
            assert.equal(
              await fundMe.getAddressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only deployer can withdraw funds", async function () {
          const fundMeConnectedContract = await fundMe.connect(accounts[1]);
          await expect(
            fundMeConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner");
        });
      });
    });
