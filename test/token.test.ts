import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

// Token metadata
const tokenName = "Token";
const symbol = "CRPT";
const decimals = 18;
const feeRate = 150; // 1.5%
const tenTokens = ethers.utils.parseUnits("10.0", decimals);
const twentyTokens = ethers.utils.parseUnits("20.0", decimals);

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole = ethers.utils.solidityKeccak256(["string"], ["MINTER_ROLE"]);
const burnerRole = ethers.utils.solidityKeccak256(["string"], ["BURNER_ROLE"]);

describe("Token", function () {
  let Token: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    token: Contract;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    Token = await ethers.getContractFactory("Token");
  });

  beforeEach(async () => {
    token = await Token.deploy(tokenName, symbol, feeRate);
    await token.deployed();

    // Add owner and Alice to whitelist so they dont have to pay fee
    await token.addToWhitelist(owner.address);
    await token.addToWhitelist(alice.address);

    // Grant roles and mint some tokens before transferring admin role to DAO
    await token.grantRole(minterRole, alice.address);
    await token.grantRole(burnerRole, bob.address);
    const amount = ethers.utils.parseUnits("1000.0", decimals);
    await token.connect(alice).mint(owner.address, amount);
    // await token.connect(alice).mint(alice.address, amount);
    await token.connect(alice).mint(bob.address, amount);
  });

  describe("Deployment", function () {
    it("Has a name", async () => {
      expect(await token.name()).to.be.equal(tokenName);
    });

    it("Has a symbol", async () => {
      expect(await token.symbol()).to.be.equal(symbol);
    });

    it(`Has ${decimals} decimals`, async () => {
      expect(await token.decimals()).to.be.equal(decimals);
    });

    it(`Has 1.5% fee rate`, async () => {
      expect(await token.getFeeRate()).to.be.equal(feeRate);
    });

    it("Should set the right admin role", async () => {
      expect(await token.hasRole(adminRole, owner.address)).to.equal(true);
    });

    it("Should set the right minter role", async () => {
      expect(await token.hasRole(minterRole, alice.address)).to.equal(true);
    });

    it("Should set the right burner role", async () => {
      expect(await token.hasRole(burnerRole, bob.address)).to.equal(true);
    });

    it("Should set owner as fee recipient", async () => {
      expect(await token.getFeeRecipient()).to.be.equal(owner.address);
    });

    it("Should add owner & Alice to whitelist", async () => {
      expect(await token.isWhitelisted(owner.address)).to.equal(true);
      expect(await token.isWhitelisted(alice.address)).to.equal(true);
    });
  });

  describe("Ownership", function () {
    it("Only admin can grant roles", async () => {
      await expect(
        token.connect(alice).grantRole(burnerRole, alice.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("Whitelist", function () {
    it("Only admin should be able to whitelist", async () => {
      await expect(token.connect(alice).addToWhitelist(alice.address)).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Adding to whitelist emits event", async () => {
      await expect(token.addToWhitelist(alice.address))
        .to.emit(token, "AddToWhitelist")
        .withArgs(owner.address, alice.address);
    });

    it("Removing from whitelist emits event", async () => {
      await expect(token.removeFromWhitelist(alice.address))
        .to.emit(token, "RemoveFromWhitelist")
        .withArgs(owner.address, alice.address);
    });

    it("Only admin should be able to remove from whitelist", async () => {
      await expect(
        token.connect(alice).removeFromWhitelist(owner.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("Fees", function () {
    it("Should not be able to change fee rate without DEFAULT_ADMIN_ROLE", async () => {
      const newFee = 2;
      await expect(token.connect(alice).changeFeeRate(newFee)).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Changing fee rate emits event", async () => {
      const newFee = ethers.utils.parseUnits("3.5", decimals);
      await expect(token.changeFeeRate(newFee))
        .to.emit(token, "ChangeFeeRate")
        .withArgs(owner.address, newFee);
    });

    it("Changing fee recipient emits event", async () => {
      await expect(token.changeFeeRecipient(alice.address))
        .to.emit(token, "ChangeFeeRecipient")
        .withArgs(owner.address, alice.address);
    });

    it("Should not be able to change fee recipient without DEFAULT_ADMIN_ROLE", async () => {
      await expect(
        token.connect(alice).changeFeeRecipient(alice.address)
      ).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Admin can change fee recipient", async () => {
      await token.changeFeeRecipient(alice.address);
      expect(await token.getFeeRecipient()).to.be.equal(alice.address);
    });

    it("Transfer should not charge fee from whitelisted users", async () => {
      const amount: BigNumber = tenTokens;
      await token.transfer(alice.address, amount);
      const aliceBalance = await token.balanceOf(alice.address);
      expect(aliceBalance).to.equal(amount);
    });

    it("Transfer should charge fee from spender in favor of fee recipient", async () => {
      const initBobBalance = await token.balanceOf(bob.address);
      const fee: BigNumber = tenTokens.mul(feeRate).div(10000);
      await token.connect(bob).transfer(alice.address, tenTokens);
      const bobBalance = await token.balanceOf(bob.address);
      expect(bobBalance).to.equal(initBobBalance.sub(tenTokens).sub(fee));
    });

    it("Transfer should fail if sender doesn't have enough tokens to pay fee", async () => {
      const bobBalance = await token.balanceOf(bob.address);
      // Trying to send all Bob's tokens to Alice
      await expect(
        token.connect(bob).transfer(alice.address, bobBalance)
      ).to.be.revertedWith("Not enough to pay fee");
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async () => {
      // Transfer 20 tokens from owner to Alice
      const amount: BigNumber = ethers.utils.parseUnits("20.0", decimals);
      await token.transfer(alice.address, amount);
      const aliceBalance = await token.balanceOf(alice.address);
      expect(aliceBalance).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async () => {
      // Trying to send 10 tokens from Alice (0 tokens) to owner (1000 tokens)
      await expect(
        token.connect(alice).transfer(owner.address, tenTokens)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance'");

      // Owner balance shouldn't have changed
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalance);
    });

    it("Can not transfer above the amount", async () => {
      await expect(
        token.transfer(alice.address, ethers.utils.parseUnits("1000.01", decimals))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Transfer should emit event", async () => {
      const from = owner.address;
      const to = alice.address;
      const amount = tenTokens;

      await expect(token.transfer(to, amount))
        .to.emit(token, "Transfer")
        .withArgs(from, to, amount);
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialAliceBalance = await token.balanceOf(alice.address);
      const initialBobBalance = await token.balanceOf(bob.address);

      // Transfer 10 tokens from owner to Alice
      await token.transfer(alice.address, tenTokens);
      // Transfer another 10 tokens from owner to Bob
      await token.transfer(bob.address, tenTokens);

      // Check balances
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance).to.be.equal(initialOwnerBalance.sub(twentyTokens));

      const aliceBalance = await token.balanceOf(alice.address);
      expect(aliceBalance).to.be.equal(initialAliceBalance.add(tenTokens));

      const bobBalance = await token.balanceOf(bob.address);
      expect(bobBalance).to.be.equal(initialBobBalance.add(tenTokens));
    });
  });

  describe("Allowance", function () {
    it("Approve should emit event", async () => {
      const amount = tenTokens;
      await expect(token.approve(alice.address, amount))
        .to.emit(token, "Approval")
        .withArgs(owner.address, alice.address, amount);
    });

    it("Allowance should change after token approve", async () => {
      await token.approve(alice.address, tenTokens);
      const allowance = await token.allowance(owner.address, alice.address);
      expect(allowance).to.be.equal(tenTokens);
    });

    it("TransferFrom should emit event", async () => {
      const amount = tenTokens;
      await token.approve(alice.address, amount);
      await expect(
        token.connect(alice).transferFrom(owner.address, alice.address, amount)
      )
        .to.emit(token, "Transfer")
        .withArgs(owner.address, alice.address, amount);
    });

    it("Can not TransferFrom above the approved amount", async () => {
      // Approve 10 tokens to Alice
      await token.approve(alice.address, tenTokens);
      // Trying to transfer 20 tokens
      await expect(
        token.connect(alice).transferFrom(owner.address, alice.address, twentyTokens)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });

    it("Can not TransferFrom if owner does not have enough tokens", async () => {
      // Approve Alice to use 10 tokens
      await token.approve(alice.address, tenTokens);

      // Send most of owner tokens to Bob
      await token.transfer(bob.address, ethers.utils.parseUnits("995.0", decimals));

      // Check that Alice can't transfer all amount (only 5 left)
      await expect(
        token.connect(alice).transferFrom(owner.address, alice.address, tenTokens)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  // In our tests Bob has the BURNER_ROLE
  describe("Burning", function () {
    it("Should not be able to burn tokens without BURNER_ROLE", async () => {
      const burnAmount = tenTokens;
      await expect(token.burn(alice.address, burnAmount)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${burnerRole}`
      );
    });

    it("Burner should be able to burn tokens", async () => {
      const burnAmount = tenTokens;
      await expect(token.connect(bob).burn(owner.address, burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, ethers.constants.AddressZero, burnAmount);
    });

    it("Token supply & balance should change after burning", async () => {
      const initialSupply = await token.totalSupply();
      const initialOwnerBalance = await token.balanceOf(owner.address);

      const burnAmount = tenTokens;
      await token.connect(bob).burn(owner.address, burnAmount);

      const currentSupply = await token.totalSupply();
      expect(currentSupply).to.equal(initialSupply.sub(burnAmount));

      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialOwnerBalance.sub(burnAmount));
    });

    it("Can not burn above total supply", async () => {
      const initialSupply = await token.totalSupply();
      await expect(
        token.connect(bob).burn(owner.address, initialSupply)
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });
  });

  // In out tests Alice has the MINTER_ROLE
  describe("Minting", function () {
    it("Should not be able to mint tokens without MINTER_ROLE", async () => {
      const mintAmount = tenTokens;
      await expect(token.mint(alice.address, mintAmount)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${minterRole}`
      );
    });

    it("Minter should be able to mint tokens", async () => {
      const mintAmount = tenTokens;
      await expect(token.connect(alice).mint(owner.address, mintAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.constants.AddressZero, owner.address, mintAmount);
    });

    it("Token supply & balance should change after minting", async () => {
      const initialSupply = await token.totalSupply();
      const initialOwnerBalance = await token.balanceOf(owner.address);

      const mintAmount = tenTokens;
      await token.connect(alice).mint(owner.address, mintAmount);

      const currentSupply = await token.totalSupply();
      expect(currentSupply).to.equal(initialSupply.add(mintAmount));

      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(initialOwnerBalance.add(mintAmount));
    });
  });
});
