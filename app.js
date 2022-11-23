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


    const signTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);

    await web3.eth.sendSignedTransaction(signTx.rawTransaction);



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
app.get('/getBalance/:address', async (req, res) => {

    try {
        const balance = await readBalance(req.params.address);
        const balanceInEth = BigNumber(balance).divide(1000000000000000000).toString();
        res.status(200).send({
            valid: true,
            balance: balanceInEth,
            error: null
        });
    } catch (e) {
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
        res.status(401).send(
            {
                error: "Unauthorised",
                amount: 0,
            }
        );
    }
    else if (!(web3.utils.isAddress(address))) {
        res.status(404).send({
            amount: 0,
            error: "Invalid Address"
        });
    } else if (parseFloat(amount) < 0) {
        res.status(404).send({
            amount: 0,
            error: "Invalid Amount"
        });
    }
    else {
        var amountInWei = BigNumber(amount).multiply(1000000000000000000).toString();

        const nonce = await web3.eth.getTransactionCount(PUBLIC_KEY, 'latest'); //get latest nonce
        const gasEstimate = await contract.methods.sendTokens(address, amountInWei).estimateGas({ 'from': PUBLIC_KEY }); // estimate gas

        const tx = {
            'from': PUBLIC_KEY,
            'to': assets.address,
            'nonce': nonce,
            'gas': gasEstimate,
            'data': contract.methods.sendTokens(address, amountInWei).encodeABI()
        };

        try {

            const signTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
            await web3.eth.sendSignedTransaction(signTx.rawTransaction);

            res.status(200).send({
                amount: 200,
                error: null
            })
        } catch (e) {

            res.status(503).send(
                {
                    amount: 0,
                    error: "insufficient funds for gas"
                }
            )

        }

    }
})

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`port${port} `));