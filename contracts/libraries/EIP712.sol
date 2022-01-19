// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

abstract contract EIP712 {
  struct EIP712Domain {
    string  name;
    string  version;
    uint256 chainId;
    address verifyingContract;
  }

  bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
  );

  bytes32 immutable public DOMAIN_SEPARATOR;
  
  constructor(string memory name, string memory version) {
    uint chainId_;
    assembly{
      chainId_ := chainid()
    }
    DOMAIN_SEPARATOR = hash(EIP712Domain({
      name              : name,
      version           : version,
      chainId           : chainId_,
      verifyingContract : address(this)
    }));
  }

  function hash(EIP712Domain memory eip712Domain)
    internal
    pure
    returns (bytes32)
  {
    return keccak256(abi.encode(
      EIP712DOMAIN_TYPEHASH,
      keccak256(bytes(eip712Domain.name)),
      keccak256(bytes(eip712Domain.version)),
      eip712Domain.chainId,
      eip712Domain.verifyingContract
    ));
  }
}