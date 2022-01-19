import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import * as snapshot from "./utils";

// Academy 721 metadata
const name = "Academy721";
const symbol = "acdm721";
const rangeUnit = 1000;
const uri = "https://gateway.pinata.cloud/ipfs/uri/{id}.json";
const firstItem = 31337000;
const secondItem = 31337001;

// Test data
const zeroAddr = ethers.constants.AddressZero;

// Bridge data
const version = "1";

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE, CREATOR_ROLE
const adminRole = ethers.constants.HashZero;
const bridgeRole = ethers.utils.solidityKeccak256(["string"], ["BRIDGE_ROLE"]);
const creatorRole = ethers.utils.solidityKeccak256(["string"], ["CREATOR_ROLE"]);

describe("Bridge", function () {
  let nftMain: Contract,
    nftSide: Contract,
    mainBridge: Contract,
    sideBridge: Contract,
    Academy721: ContractFactory,
    Bridge: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[],
    snapId: string;

  before(async () => {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    Academy721 = await ethers.getContractFactory(name);
    Bridge = await ethers.getContractFactory("Bridge");

    nftMain = await Academy721.deploy(name, symbol, rangeUnit);
    await nftMain.deployed();
    nftSide = await Academy721.deploy(name, symbol, rangeUnit);
    await nftSide.deployed();

    // eslint-disable-next-line prettier/prettier
    mainBridge = await Bridge.deploy(
      name,
      version,
      nftMain.address,
      bob.address
    );
    await mainBridge.deployed();

    // eslint-disable-next-line prettier/prettier
    sideBridge = await Bridge.deploy(
      name,
      version,
      nftSide.address,
      bob.address
    );
    await sideBridge.deployed();

    // Grant roles to bridges
    await nftMain.grantRole(bridgeRole, mainBridge.address);
    await nftSide.grantRole(bridgeRole, sideBridge.address);

    // Grant creator role to owner
    await nftMain.grantRole(creatorRole, owner.address);
    await nftSide.grantRole(creatorRole, owner.address);

    // Minting items on mainBridge contract
    await nftMain.safeMint(owner.address, uri);
    await nftMain.safeMint(owner.address, uri);
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Deployment", function () {
    it("Should deploy main bridge with correct params", async () => {
      expect(await mainBridge.nft()).to.equal(nftMain.address);
      expect(await mainBridge.gateway()).to.equal(bob.address);
    });

    it("Should deploy side bridge with correct params", async () => {
      expect(await mainBridge.nft()).to.equal(nftMain.address);
      expect(await mainBridge.gateway()).to.equal(bob.address);
    });

    it("Should deploy main nft with correct params", async () => {
      expect(await nftMain.chainId()).to.equal(network.config.chainId);
    });

    it("Should deploy side nft with correct params", async () => {
      expect(await nftSide.chainId()).to.equal(network.config.chainId);
    });
  });

  describe("Minting", function () {
    it("Can't mint with incorrect id", async () => {
      await expect(
        nftMain.safeMintBridge(0, 31337, owner.address, uri)
      ).to.be.revertedWith("Incorrect id");
    });
  });

  describe("Swapping", function () {
    it("Calling mainBridge chain swap", async () => {
      await nftMain.approve(mainBridge.address, firstItem);
      await expect(mainBridge.swap(firstItem, alice.address, 31337, 15))
        .to.emit(mainBridge, "SwapInitialized")
        .and.to.emit(nftMain, "Transfer")
        .withArgs(owner.address, mainBridge.address, firstItem);
    });

    it("Swap - Redeem, Main - Side", async () => {
      await nftMain.approve(mainBridge.address, firstItem);

      const tx = await mainBridge.swap(firstItem, alice.address, 31337, 15);
      const receipt = await tx.wait();
      const event = receipt.events?.filter((x: any) => {return x.event == "SwapInitialized"});
      const eventData = event[0].args;

      const bytes = ethers.utils.arrayify(eventData.swapHash);
      const messageHash = ethers.utils.hashMessage(bytes);

      const signature = await bob.signMessage(bytes);
      const recovered = ethers.utils.verifyMessage(bytes, signature);
      expect(recovered).to.equal(bob.address);

      const splitSig = ethers.utils.splitSignature(signature);
      await expect(
        sideBridge
          .connect(bob)
          .redeem(
            messageHash,
            splitSig,
            eventData.to,
            eventData.itemId,
            eventData.uri,
            eventData.chainFrom
          )
      )
        .to.emit(sideBridge, "SwapRedeemed")
        .and.to.emit(nftSide, "Transfer")
        .withArgs(zeroAddr, eventData.to, firstItem);
    });

    // it("Calling sideBridge chain swap", async () => {
    //   await expect(mainBridge.swap(firstItem, alice.address, 31337, 15))
    //     .to.emit(mainBridge, "SwapInitialized")
    //     .and.to.emit(nftMain, "Transfer")
    //     .withArgs(owner.address, mainBridge.address, firstItem);
    // });
  });
});
