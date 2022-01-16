import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// NFT metadata
const name = "Academy721";
const symbol = "acdm721";

// Test data
const zeroAddr = ethers.constants.AddressZero;
const firstItemURI = "https://gateway.pinata.cloud/ipfs/uri/1.json";
const secondItemURI = "https://gateway.pinata.cloud/ipfs/uri/2.json";
const firstItemID = 1;
const secondItemID = 2;

describe("Academy721", function () {
  let Academy721: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    acdm: Contract;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    Academy721 = await ethers.getContractFactory(name);
  });

  beforeEach(async () => {
    acdm = await Academy721.deploy(name, symbol);
    await acdm.deployed();
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

  describe("Minting", function () {
    it("Owner can mint new item", async () => {
      await expect(acdm.safeMint(owner.address, firstItemURI))
        .to.emit(acdm, "Transfer")
        .withArgs(zeroAddr, owner.address, firstItemID);

      expect(await acdm.tokenURI(firstItemID)).to.equal(firstItemURI);
    });

    it("Only owner can call mint", async () => {
      await expect(
        acdm.connect(alice).safeMint(bob.address, firstItemURI)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Getting item data", function () {
    beforeEach(async () => {
      // Minting 2 items
      await acdm.safeMint(owner.address, firstItemURI);
      await acdm.safeMint(alice.address, secondItemURI);
    });

    it("Can get tokenURI by id", async () => {
      expect(await acdm.tokenURI(firstItemID)).to.be.equal(firstItemURI);
      expect(await acdm.tokenURI(secondItemID)).to.be.equal(secondItemURI);
    });

    it("Can get item owner by id", async () => {
      expect(await acdm.ownerOf(firstItemID)).to.be.equal(owner.address);
      expect(await acdm.ownerOf(secondItemID)).to.be.equal(alice.address);
    });

    it("Can get item owner by id", async () => {
      expect(await acdm.ownerOf(firstItemID)).to.be.equal(owner.address);
      expect(await acdm.ownerOf(secondItemID)).to.be.equal(alice.address);
    });
  });

  // describe("Transfers", function () {

  // });
});
