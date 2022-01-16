import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as snapshot from "./utils";

// Academy 1155 metadata
const name = "Academy1155";
const uri = "https://gateway.pinata.cloud/ipfs/uri/{id}.json";
const mintIds = [0, 1];
const mintAmounts = [5, 15];
const DATA = "0x02";

// Test data
const zeroAddr = ethers.constants.AddressZero;

describe("Academy1155", function () {
  let Academy1155: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    acdm: Contract,
    snapId: string;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    Academy1155 = await ethers.getContractFactory(name);

    acdm = await Academy1155.deploy(uri);
    await acdm.deployed();
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
    await acdm.mintBatch(owner.address, mintIds, mintAmounts, DATA);
    await acdm.mintBatch(alice.address, mintIds, mintAmounts, DATA);
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Deployment", function () {
    it("Has a uri", async () => {
      expect(await acdm.uri(1)).to.be.equal(uri);
    });

    it("Should set the correct owner of the contract", async () => {
      expect(await acdm.owner()).to.equal(owner.address);
    });
  });

  describe("Ownership", function () {
    it("Only owner can mint items", async () => {
      await expect(
        acdm.connect(alice).mintBatch(alice.address, mintIds, mintAmounts, DATA)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can set uri", async () => {
      await expect(acdm.connect(alice).setURI(uri)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Approve", function () {
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

    it("Can't self approve", async () => {
      await expect(acdm.setApprovalForAll(owner.address, true)).to.be.revertedWith(
        "ERC1155: setting approval status for self"
      );
    });
  });

  describe("Transfers", function () {
    it("safeTransfer from emits event", async () => {
      await expect(acdm.safeTransferFrom(owner.address, alice.address, 0, 2, DATA))
        .to.emit(acdm, "TransferSingle")
        .withArgs(owner.address, owner.address, alice.address, 0, 2);
    });

    it("safeBatchTransfer from emits event", async () => {
      await expect(
        acdm.safeBatchTransferFrom(owner.address, alice.address, [0, 1], [1, 1], DATA)
      )
        .to.emit(acdm, "TransferBatch")
        .withArgs(owner.address, owner.address, alice.address, [0, 1], [1, 1]);
    });

    it("Can't transfer from if caller is not owner nor approved", async () => {
      await expect(
        acdm.safeTransferFrom(alice.address, owner.address, 0, 2, DATA)
      ).to.be.revertedWith("ERC1155: caller is not owner nor approved");
      await expect(
        acdm.safeBatchTransferFrom(alice.address, owner.address, [0, 1], [1, 1], DATA)
      ).to.be.revertedWith("ERC1155: transfer caller is not owner nor approved");
    });
  });

  describe("Getting item data", function () {
    it("Can get balanceOf", async () => {
      expect(await acdm.balanceOf(owner.address, 0)).to.be.equal(mintAmounts[0]);
    });

    it("Can get balanceOfBatch", async () => {
      const balances = await acdm.balanceOfBatch([owner.address, alice.address], mintIds);
      expect(balances[0]).to.be.equal(mintAmounts[0]);
      expect(balances[1]).to.be.equal(mintAmounts[1]);
    });

    it("Can't get balance of zero address", async () => {
      await expect(acdm.balanceOf(zeroAddr, 0)).to.be.revertedWith(
        "ERC1155: balance query for the zero address"
      );
    });
  });
});
