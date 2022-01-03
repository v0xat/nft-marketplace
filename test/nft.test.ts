import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import testData from "./fixtures/sample-nft-metadata.json";

// NFT metadata
const nftName = "Essential images";
const symbol = "EI";

// Test data
const zeroAddr = ethers.constants.AddressZero;
const birdURI: string = testData.bird.metadata;
const coronaURI: string = testData.corona.metadata;
const firstItemID = 1;
const secondItemID = 2;

describe("ERC721", function () {
  let ERC721: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    nft: Contract;

  before(async () => {
    [owner, alice, bob] = await ethers.getSigners();
    ERC721 = await ethers.getContractFactory("Item721");
  });

  beforeEach(async () => {
    nft = await ERC721.deploy(nftName, symbol);
    await nft.deployed();
  });

  describe("Deployment", function () {
    it("Has a name", async () => {
      expect(await nft.name()).to.be.equal(nftName);
    });

    it("Has a symbol", async () => {
      expect(await nft.symbol()).to.be.equal(symbol);
    });

    it("Should set the correct owner of the contract", async () => {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Owner can mint new item", async () => {
      await expect(nft.safeMint(owner.address, birdURI))
        .to.emit(nft, "Transfer")
        .withArgs(zeroAddr, owner.address, firstItemID);
    });

    it("Only owner can call mint", async () => {
      await expect(nft.connect(alice).safeMint(bob.address, birdURI)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("Getting item data", function () {
    beforeEach(async () => {
      // Minting 2 items
      await nft.safeMint(owner.address, birdURI);
      await nft.safeMint(alice.address, coronaURI);
    });

    it("Can get tokenURI by id", async () => {
      expect(await nft.tokenURI(firstItemID)).to.be.equal(birdURI);
      expect(await nft.tokenURI(secondItemID)).to.be.equal(coronaURI);
    });

    it("Can get item owner by id", async () => {
      expect(await nft.ownerOf(firstItemID)).to.be.equal(owner.address);
      expect(await nft.ownerOf(secondItemID)).to.be.equal(alice.address);
    });

    it("Can get item owner by id", async () => {
      expect(await nft.ownerOf(firstItemID)).to.be.equal(owner.address);
      expect(await nft.ownerOf(secondItemID)).to.be.equal(alice.address);
    });
  });

  // describe("Transfers", function () {

  // });
});
