require("dotenv").config();

const assets = require('./constract.json')

var BigNumber = require('big-number');

const API_URL = process.env.API_URL;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const Key = process.env.KEY


const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const web3 = createAlchemyWeb3(API_URL);

const express = require('express');
const app = express();

app.use(express.json());

const contract = new web3.eth.Contract(assets.abi, assets.address);

async function readBalance(address) {
    const balance = await contract.methods.balanceOf(address).call();
    console.log(balance.toString());
    return balance.toString();

}

async function transfer(address, amount) {
    const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce
    const gasEstimate = await contract.methods.sendTokens(address, amount).estimateGas({ 'from': PUBLIC_KEY }); // estimate gas
    // Create the transaction
    const tx = {
        'from': PUBLIC_KEY,
        'to': assets.address,
        'nonce': nonce,
        'gas': gasEstimate,
        'data': contract.methods.sendTokens(address, amount).encodeABI()
    };

    const signPromise = web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
    signPromise.then((signedTx) => {
        web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (err, hash) {
            if (!err) {
                console.log("The hash of your transaction is: ", hash, "\n Check Alchemy's Mempool to view the status of your transaction!");
            } else {
                console.log("Something went wrong when submitting your transaction:", err)
            }
        });
    }).catch((err) => {
        console.log("Promise failed:", err);
    });
}

// To check Address's validity
app.get('/validate/:address', async (req, res) => {
    try {
        const valid = web3.utils.isAddress(req.params.address);
        res.status(200).send({
            valid: valid,
            error: null,
        })
    } catch (e) {
        res.status(400).send({
            valid: false,
            error: e.code,
        })
    }

})


// To check user's balance
app.get('/:address', async (req, res) => {
    try {
        const balance = await readBalance(req.params.address);
        const balanceInEth = BigNumber(balance).divide(1000000000000000000).toString();
        res.status(200).send({
            valid: true,
            balance: balanceInEth,
            error: null
        });
    } catch (e) {
        console.log(e.code);
        res.status(400).send({
            valid: false,
            balance: 0,
            error: e.code,
        })
    }

});

// To send Tokens to user
app.post('/giftTokens', async (req, res) => {
    const address = req.body.address;
    var amount = req.body.amount;
    var keySent = req.body.key;

    if (keySent != Key) {
        console.log(keySent);
        console.log(Key);

        res.sendStatus(401).send("Unauthorised");
    } else {
        var amountInWei = BigNumber(amount).multiply(1000000000000000000).toString();

        await transfer(address, amountInWei);

        res.sendStatus(200).send(amount);
    }


})

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`port${port} `));