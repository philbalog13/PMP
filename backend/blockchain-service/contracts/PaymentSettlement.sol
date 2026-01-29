// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PaymentSettlement {
    struct Payment {
        bytes32 transactionId;
        address merchant;
        uint256 amount;
        uint256 timestamp;
        bool settled;
    }
    
    mapping(bytes32 => Payment) public payments;
    bytes32[] public transactionIds;
    
    event PaymentCreated(bytes32 indexed txId, uint256 amount);
    event PaymentSettled(bytes32 indexed txId);
    
    function createPayment(bytes32 _txId, address _merchant, uint256 _amount) public {
        payments[_txId] = Payment(_txId, _merchant, _amount, block.timestamp, false);
        transactionIds.push(_txId);
        emit PaymentCreated(_txId, _amount);
    }
    
    function settlePayment(bytes32 _txId) public {
        payments[_txId].settled = true;
        emit PaymentSettled(_txId);
    }
}
