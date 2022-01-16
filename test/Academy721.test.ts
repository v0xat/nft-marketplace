import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as snapshot from "./utils";

// NFT metadata
const name = "Academy721";
const symbol = "acdm721";

// Test data
const zeroAddr = ethers.constants.AddressZero;
const itemURI = "https://gateway.pinata.cloud/ipfs/uri/1.json";

describe("Academy721", function () {
  let Academy721: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    acdm: Contract,
    snapId: string;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    Academy721 = await ethers.getContractFactory(name);

    acdm = await Academy721.deploy(name, symbol);
    await acdm.deployed();
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
    await acdm.safeMint(owner.address, itemURI);
    await acdm.safeMint(alice.address, itemURI);
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Deployment", function () {
    it("Has a name", async () => {
      expect(await acdm.name()).to.be.equal(name);
    });

    it("Has a symbol", async () => {
      expect(await acdm.symbol()).to.be.equal(symbol);
    });

    it("Should set the correct owner of the contract", async () => {
      expect(await acdm.owner()).to.equal(owner.address);
    });
  });

  describe("Ownership", function () {
    it("Only owner can mint items", async () => {
      await expect(acdm.connect(alice).safeMint(bob.address, itemURI)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Approve", function () {
    it("Approve emits event", async () => {
      await expect(acdm.approve(alice.address, 1))
        .to.emit(acdm, "Approval")
        .withArgs(owner.address, alice.address, 1);
    });

    it("Can get approved account", async () => {
      await acdm.approve(alice.address, 1);
      expect(await acdm.getApproved(1)).to.be.equal(alice.address);
      expect(await acdm.getApproved(2)).to.be.equal(zeroAddr);
    });

    it("Approval for all emits event", async () => {
      await expect(acdm.setApprovalForAll(alice.address, true))
        .to.emit(acdm, "ApprovalForAll")
        .withArgs(owner.address, alice.address, true);
    });

    it("Can check whether all owner items are approved", async () => {
      await acdm.setApprovalForAll(bob.address, true);
      expect(await acdm.isApprovedForAll(owner.address, bob.address)).to.be.equal(true);
      expect(await acdm.isApprovedForAll(bob.address, owner.address)).to.be.equal(false);
    });

    it("Can't get approved for nonexistent token", async () => {
      await expect(acdm.getApproved(1337)).to.be.revertedWith(
        "ERC721: approved query for nonexistent token"
      );
    });

    it("Can't approve to current owner", async () => {
      await expect(acdm.approve(owner.address, 1)).to.be.revertedWith(
        "ERC721: approval to current owner"
      );
    });

    it("Can't approve if caller is not owner nor approved for all", async () => {
      await expect(acdm.approve(bob.address, 2)).to.be.revertedWith(
        "ERC721: approve caller is not owner nor approved for all"
      );
    });
  });

  describe("Transfers", function () {
    it("Transfer from emits event", async () => {
      await expect(acdm.transferFrom(owner.address, alice.address, 1))
        .to.emit(acdm, "Transfer")
        .withArgs(owner.address, alice.address, 1);
    });

    it("Safe Transfer from emits event", async () => {
      await expect(
        acdm["safeTransferFrom(address,address,uint256)"](owner.address, alice.address, 1)
      )
        .to.emit(acdm, "Transfer")
        .withArgs(owner.address, alice.address, 1);
    });

    it("Can't transfer from if caller is not owner nor approved for all", async () => {
      await expect(acdm.transferFrom(owner.address, alice.address, 2)).to.be.revertedWith(
        "ERC721: transfer caller is not owner nor approved"
      );
      await expect(
        acdm["safeTransferFrom(address,address,uint256)"](owner.address, alice.address, 2)
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
    });
  });

  describe("Getting item data", function () {
    it("Can get tokenURI by id", async () => {
      expect(await acdm.tokenURI(1)).to.be.equal(itemURI);
      expect(await acdm.tokenURI(2)).to.be.equal(itemURI);
    });

    it("Can get item owner by id", async () => {
      expect(await acdm.ownerOf(1)).to.be.equal(owner.address);
      expect(await acdm.ownerOf(2)).to.be.equal(alice.address);
    });

    it("Can get user balances", async () => {
      expect(await acdm.balanceOf(owner.address)).to.be.equal(1);
      expect(await acdm.balanceOf(alice.address)).to.be.equal(1);
    });
  });
});
