import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import testData from "./fixtures/sample-nft-metadata.json";

// Token metadata
const tokenName = "AcademyToken";
const tokenSymbol = "ACDM";
const decimals = 18;
const tenTokens = ethers.utils.parseUnits("10.0", decimals);
const twentyTokens = ethers.utils.parseUnits("20.0", decimals);

// NFT metadata
const nftName = "EssentialImages";
const nftSymbol = "EI";

// Test data
const biddingTime = 259200; // 3 days in seconds
const bidStep = ethers.utils.parseUnits("1.0", decimals);
const zeroAddr = ethers.constants.AddressZero;
const birdURI: string = testData.bird.metadata;
const coronaURI: string = testData.corona.metadata;
const firstItem = 1;
const secondItem = 2;
const firstOrder = 1;
const secondOrder = 2;

// AccessControl roles in bytes32 string
// DEFAULT_ADMIN_ROLE, MINTER_ROLE, BURNER_ROLE, CREATOR_ROLE
const adminRole = ethers.constants.HashZero;
const minterRole = ethers.utils.solidityKeccak256(["string"], ["MINTER_ROLE"]);
const burnerRole = ethers.utils.solidityKeccak256(["string"], ["BURNER_ROLE"]);
const creatorRole = ethers.utils.solidityKeccak256(["string"], ["CREATOR_ROLE"]);

describe("Marketplace", function () {
  let mp: Contract,
    acdmToken: Contract,
    nft: Contract,
    Marketplace: ContractFactory,
    ACDMtoken: ContractFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    addrs: SignerWithAddress[];

  before(async () => {
    [owner, alice, bob, ...addrs] = await ethers.getSigners();
    ACDMtoken = await ethers.getContractFactory(tokenName);
    Marketplace = await ethers.getContractFactory("Marketplace");
  });

  beforeEach(async () => {
    // Deploy token
    acdmToken = await ACDMtoken.deploy(tokenName, tokenSymbol);
    await acdmToken.deployed();

    // Deploy Marketplace & NFT contract, set CREATOR_ROLE to Alice
    mp = await Marketplace.deploy(
      biddingTime,
      acdmToken.address,
      alice.address,
      nftName,
      nftSymbol
    );
    await mp.deployed();

    // Getting NFT contract
    const nftAddr: string = await mp.acdmItems();
    nft = await ethers.getContractAt(nftName, nftAddr);

    // Grant Minter & Burner role to admin
    await acdmToken.grantRole(minterRole, owner.address);
    await acdmToken.grantRole(burnerRole, owner.address);

    // Mint some tokens
    await acdmToken.mint(addrs[0].address, twentyTokens);
    await acdmToken.mint(owner.address, twentyTokens);
    await acdmToken.mint(alice.address, twentyTokens);
    await acdmToken.mint(bob.address, twentyTokens.mul(2));

    // Approve token to marketplace
    await acdmToken.approve(mp.address, twentyTokens);
    await acdmToken.connect(alice).approve(mp.address, twentyTokens);
    await acdmToken.connect(bob).approve(mp.address, twentyTokens.mul(2));
    await acdmToken.connect(addrs[0]).approve(mp.address, twentyTokens);

    // Minting 2 items
    await mp.connect(alice).createItem(owner.address, birdURI);
    await mp.connect(alice).createItem(alice.address, coronaURI);

    // Approving items to Marketplace
    await nft.approve(mp.address, firstItem);
    await nft.connect(alice).approve(mp.address, secondItem);
  });

  describe("Deployment", function () {
    it("Should set Marketplace as NFT contract owner", async () => {
      expect(await nft.owner()).to.equal(mp.address);
    });

    it("Should set right acdmToken owner", async () => {
      expect(await acdmToken.hasRole(adminRole, owner.address)).to.equal(true);
    });

    it("Should set right acdmToken contract address", async () => {
      expect(await mp.acdmToken()).to.be.equal(acdmToken.address);
    });

    it("Should set right NFT contract address", async () => {
      expect(await mp.acdmItems()).to.be.equal(nft.address);
    });

    it("Should set right bidding time", async () => {
      expect(await mp.biddingTime()).to.be.equal(biddingTime);
    });

    it("Roles should be set correctly", async () => {
      expect(await mp.hasRole(creatorRole, alice.address)).to.equal(true);
      expect(await acdmToken.hasRole(minterRole, owner.address)).to.equal(true);
      expect(await acdmToken.hasRole(burnerRole, owner.address)).to.equal(true);
    });
  });

  describe("Pausable", function () {
    it("Should be able to pause & unpause contract", async () => {
      await mp.pause();
      await expect(mp.changeBiddingTime(biddingTime)).to.be.revertedWith(
        "Pausable: paused"
      );
      await mp.unpause();
      await mp.changeBiddingTime(biddingTime);
    });

    it("Only admin should be able to pause contract", async () => {
      await expect(mp.connect(alice).pause()).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });
  });

  describe("Bidding time", function () {
    it("Only admin can change bidding time", async () => {
      await expect(mp.connect(alice).changeBiddingTime(biddingTime)).to.be.revertedWith(
        `AccessControl: account ${alice.address.toLowerCase()} is missing role ${adminRole}`
      );
    });

    it("Changing the bidding time triggers event", async () => {
      await expect(mp.changeBiddingTime(biddingTime))
        .to.emit(mp, "BiddingTimeChanged")
        .withArgs(owner.address, biddingTime);
    });
  });

  describe("Creating items", function () {
    it("Only address with CREATOR_ROLE should be able to create item", async () => {
      await expect(mp.createItem(owner.address, birdURI)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${creatorRole}`
      );
    });

    it("Creator should be able to create item", async () => {
      await expect(mp.connect(alice).createItem(owner.address, birdURI))
        .and.to.emit(nft, "Transfer")
        .withArgs(zeroAddr, owner.address, 3);
      expect(await nft.tokenURI(3)).to.equal(birdURI);
    });
  });

  describe("Fixed price orders", function () {
    beforeEach(async () => {
      // Listing first item
      await mp.listFixedPrice(firstItem, tenTokens);
    });

    describe("Listing item", function () {
      it("Can't place order with zero price", async () => {
        await expect(mp.listFixedPrice(firstItem, 0)).to.be.revertedWith(
          "Price & bid step can't be zero"
        );
      });

      it("Listing emits events", async () => {
        await expect(mp.connect(alice).listFixedPrice(secondItem, tenTokens))
          .to.emit(mp, "PlacedOrder")
          .withArgs(secondOrder, secondItem, alice.address, tenTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(alice.address, mp.address, secondItem);

        const order = await mp.orders(secondOrder);
        expect(order.basePrice).to.be.equal(tenTokens);
      });
    });

    describe("Cancelling order", function () {
      it("Can cancel only own order", async () => {
        await expect(mp.connect(alice).cancelOrder(firstOrder)).to.be.revertedWith(
          "Not the order creator"
        );
      });

      it("Cancelling order emits events", async () => {
        await expect(mp.cancelOrder(firstOrder))
          .to.emit(mp, "CancelledOrder")
          .withArgs(firstOrder, false)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, owner.address, firstItem);
      });
    });

    describe("Buying", function () {
      it("Can't buy from yourself", async () => {
        await expect(mp.buyOrder(firstOrder)).to.be.revertedWith(
          "Can't buy from yourself"
        );
      });

      it("Can't buy an auction order", async () => {
        await mp.connect(alice).listAuction(secondItem, tenTokens, bidStep);
        await expect(mp.buyOrder(secondOrder)).to.be.revertedWith(
          "Can't buy auction order"
        );
      });

      it("Can't buy cancelled or non-existent order", async () => {
        await expect(mp.connect(alice).buyOrder(firstOrder));
        await expect(mp.connect(alice).buyOrder(firstOrder)).to.be.revertedWith(
          "Order cancelled or not exist"
        );
        await expect(mp.connect(alice).buyOrder(123)).to.be.revertedWith(
          "Order cancelled or not exist"
        );
      });

      it("Buying emits events", async () => {
        await expect(mp.connect(alice).buyOrder(firstOrder))
          .to.emit(mp, "Purchase")
          .withArgs(firstOrder, firstItem, owner.address, alice.address, tenTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, alice.address, firstItem)
          .and.to.emit(acdmToken, "Transfer")
          .withArgs(alice.address, owner.address, tenTokens)
          .and.to.emit(mp, "CancelledOrder")
          .withArgs(firstOrder, true);
      });
    });
  });

  describe("Auction orders", function () {
    describe("Placing order", function () {
      it("Can't place order with zero price", async () => {
        await expect(mp.listAuction(firstItem, 0, bidStep)).to.be.revertedWith(
          "Price & bid step can't be zero"
        );
      });

      it("Can't place order with zero bidStep", async () => {
        await expect(mp.listAuction(firstItem, tenTokens, 0)).to.be.revertedWith(
          "Price & bid step can't be zero"
        );
      });

      it("Listing emits events", async () => {
        await expect(mp.listAuction(firstItem, tenTokens, bidStep))
          .to.emit(mp, "PlacedOrder")
          .withArgs(firstOrder, firstItem, owner.address, tenTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(owner.address, mp.address, firstItem);
      });
    });

    describe("Bidding", function () {
      beforeEach(async () => {
        // Listing items
        await mp.connect(alice).listAuction(secondItem, tenTokens, bidStep);
      });

      it("Can't bid less than the highest bid", async () => {
        await expect(mp.makeBid(firstOrder, tenTokens)).to.be.revertedWith(
          "Bid must be more than highest + bid step"
        );
      });

      it("Can't bid less than the highest bid + bid step", async () => {
        await expect(mp.makeBid(firstOrder, tenTokens.add(bidStep))).to.be.revertedWith(
          "Bid must be more than highest + bid step"
        );
      });

      it("Can't make a bid on a non-existent order", async () => {
        await expect(mp.makeBid(123, tenTokens)).to.be.revertedWith(
          "Bidding time is over"
        );
      });

      it("Can't make a bid on your own order", async () => {
        await expect(
          mp.connect(alice).makeBid(firstOrder, twentyTokens)
        ).to.be.revertedWith("Can't bid on your own order");
      });

      it("Can't make a bid on fixed price order", async () => {
        await mp.listFixedPrice(firstItem, tenTokens);
        await expect(
          mp.connect(alice).makeBid(secondOrder, twentyTokens)
        ).to.be.revertedWith("Bidding time is over");
      });

      it("Can't make a bid after the end of bidding time", async () => {
        await ethers.provider.send("evm_increaseTime", [biddingTime]);
        await expect(mp.makeBid(firstOrder, twentyTokens)).to.be.revertedWith(
          "Bidding time is over"
        );
      });

      it("Bidding emits event", async () => {
        await expect(mp.makeBid(firstOrder, twentyTokens))
          .to.emit(mp, "NewHighestBid")
          .withArgs(firstOrder, owner.address, twentyTokens)
          .and.to.emit(acdmToken, "Transfer")
          .withArgs(owner.address, mp.address, twentyTokens);

        const order = await mp.orders(firstOrder);
        expect(order.numBids).to.be.equal(1);
      });

      it("Tokens are returned to previous bidder after a new highest bid", async () => {
        const ownerBalance = await acdmToken.balanceOf(owner.address);
        await mp.makeBid(firstOrder, twentyTokens);
        let bids = await mp.getBidsByOrder(firstOrder);
        // [bids.length - 1] gives us the last bid (i.e. highest bid)
        expect(bids[bids.length - 1].bidder).to.be.equal(owner.address);

        // Check highest bidder changed
        await mp.connect(bob).makeBid(firstOrder, twentyTokens.mul(2));
        bids = await mp.getBidsByOrder(firstOrder);
        expect(bids[bids.length - 1].bidder).to.be.equal(bob.address);

        // Check owner got his tokens back
        expect(await acdmToken.balanceOf(owner.address)).to.be.equal(ownerBalance);
      });
    });

    describe("Finish auction", function () {
      beforeEach(async () => {
        // Listing item
        await mp.listAuction(firstItem, bidStep, bidStep);
      });

      it("Can't finish fixed price order", async () => {
        await mp.connect(alice).listFixedPrice(secondItem, tenTokens);
        await expect(mp.connect(alice).finishAuction(secondOrder)).to.be.revertedWith(
          "Not an auction order"
        );
      });

      it("Can't finish before bidding time", async () => {
        await expect(mp.finishAuction(firstOrder)).to.be.revertedWith(
          "Can't finish before bidding time"
        );
      });

      it("Can't finish cancelled order", async () => {
        await ethers.provider.send("evm_increaseTime", [biddingTime]);
        await mp.finishAuction(firstOrder);
        await expect(mp.finishAuction(firstOrder)).to.be.revertedWith("No such order");
      });

      it("Only owner can finish auction", async () => {
        await expect(mp.connect(alice).finishAuction(firstOrder)).to.be.revertedWith(
          "Not the order creator"
        );
      });

      it("Finish and sell the item (more than 2 bidders)", async () => {
        // Making bids
        await mp.connect(alice).makeBid(firstOrder, bidStep.mul(3));
        await mp.connect(addrs[0]).makeBid(firstOrder, bidStep.mul(5));
        await mp.connect(bob).makeBid(firstOrder, tenTokens);

        // Skipping time
        await ethers.provider.send("evm_increaseTime", [biddingTime]);

        // Checking all events
        await expect(mp.finishAuction(firstOrder))
          .to.emit(mp, "AuctionFinished")
          .withArgs(firstOrder, 3) // '3' is the number of bids
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, bob.address, firstItem)
          .and.to.emit(acdmToken, "Transfer")
          .withArgs(mp.address, owner.address, tenTokens);
      });

      it("Finish and keep the item (less than 2 bidders)", async () => {
        // Making bids
        await mp.connect(alice).makeBid(firstOrder, tenTokens);

        // Skipping time
        await ethers.provider.send("evm_increaseTime", [biddingTime]);

        // Checking all events
        await expect(mp.finishAuction(firstOrder))
          .to.emit(mp, "AuctionFinished")
          .withArgs(firstOrder, 1) // '1' is the number of bids
          .and.to.emit(acdmToken, "Transfer")
          .withArgs(mp.address, alice.address, tenTokens)
          .and.to.emit(nft, "Transfer")
          .withArgs(mp.address, owner.address, firstItem);
      });
    });
  });

  describe("Getters", function () {
    beforeEach(async () => {
      await mp.listFixedPrice(firstItem, twentyTokens);
    });

    it("Should be able to get order by id", async () => {
      const order = await mp.orders(firstOrder);
      expect(order.basePrice).to.be.equal(twentyTokens);
      expect(order.maker).to.be.equal(owner.address);
      expect(order.endTime).to.be.equal(0);
    });

    it("Should be able to get orders history", async () => {
      await mp.connect(alice).listFixedPrice(secondItem, tenTokens);
      await mp.connect(alice).buyOrder(firstOrder);

      const orders = await mp.getOrdersHistory();
      expect(orders.length).to.be.equal(2);
      expect(orders[0].endTime).to.be.not.equal(ethers.constants.Zero);
      expect(orders[1].endTime).to.be.equal(0);
      expect(orders[1].basePrice).to.be.equal(tenTokens);
    });

    it("Should be able to get current open orders", async () => {
      await mp.connect(alice).listFixedPrice(secondItem, tenTokens);
      await mp.connect(alice).buyOrder(firstOrder);

      // for some reason it returns 2 elements
      const orders = await mp.getOpenOrders();
      // console.log(orders);
      expect(orders.length).to.be.equal(2);
      expect(orders[0].endTime).to.be.equal(0);
      expect(orders[0].maker).to.be.equal(alice.address);
      expect(orders[0].basePrice).to.be.equal(tenTokens);
    });

    it("Should be able to get bids history", async () => {
      await mp.cancelOrder(firstOrder);
      await nft.approve(mp.address, firstItem);
      await mp.listAuction(firstItem, bidStep, bidStep);

      // Making bids
      await mp.connect(alice).makeBid(secondOrder, bidStep.mul(3));
      await mp.connect(addrs[0]).makeBid(secondOrder, bidStep.mul(5));
      await mp.connect(bob).makeBid(secondOrder, tenTokens);

      await mp.connect(alice).listAuction(secondItem, bidStep, bidStep);
      await mp.connect(bob).makeBid(3, bidStep.mul(3));

      const history = await mp.getBidsHistory();
      expect(history.length).to.be.equal(3);
      expect(history[0].length).to.be.equal(0);
      expect(history[1].length).to.be.equal(3);
      expect(history[2].length).to.be.equal(1);
    });

    it("Should be able to get bids by order id", async () => {
      // Starting auction
      await mp.cancelOrder(firstOrder);
      await nft.approve(mp.address, firstItem);
      await mp.listAuction(firstItem, bidStep, bidStep);
      // Making bids
      await mp.connect(alice).makeBid(secondOrder, bidStep.mul(3));
      await mp.connect(addrs[0]).makeBid(secondOrder, bidStep.mul(5));
      await mp.connect(bob).makeBid(secondOrder, tenTokens);

      // Test first order (in beforeEach hook)
      let bids = await mp.getBidsByOrder(firstOrder);
      expect(bids.length).to.be.equal(0);

      // Test second order
      bids = await mp.getBidsByOrder(secondOrder);
      expect(bids.length).to.be.equal(3);
      expect(bids[0].amount).to.be.equal(bidStep.mul(3));
      expect(bids[0].bidder).to.be.equal(alice.address);
      expect(bids[1].amount).to.be.equal(bidStep.mul(5));
      expect(bids[1].bidder).to.be.equal(addrs[0].address);
      expect(bids[2].amount).to.be.equal(tenTokens);
      expect(bids[2].bidder).to.be.equal(bob.address);

      // Test third order
      await mp.connect(alice).listAuction(secondItem, bidStep, bidStep);
      await mp.connect(bob).makeBid(3, bidStep.mul(3));
      bids = await mp.getBidsByOrder(3);
      expect(bids.length).to.be.equal(1);
      expect(bids[0].amount).to.be.equal(bidStep.mul(3));
      expect(bids[0].bidder).to.be.equal(bob.address);
    });

    it("Should be able to check if item is listed", async () => {
      expect(await mp.isListed(firstItem)).to.be.equal(true);
      expect(await mp.isListed(secondItem)).to.be.equal(false);
    });
  });
});
