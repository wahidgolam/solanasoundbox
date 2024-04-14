
import {onRequest} from "firebase-functions/v1/https";
import {LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Connection, /*clusterApiUrl,*/ PublicKey } from "@solana/web3.js";
//import "dotenv/config"
import express = require("express");
import cors = require("cors");
import Moralis from 'moralis';


const loadSearchAddressList = async (connection: Connection, nativeAddress: any, acceptedSPLMintAddressList: any) => {
    let finalSearchAddressList: any[] = [];
    finalSearchAddressList.push({
        pubkey: new PublicKey(nativeAddress),
        mint: '-',
        name: 'SOL'
    })

    for (let i = 0; i < acceptedSPLMintAddressList.length; i++) {

        let mint_address_object = acceptedSPLMintAddressList[i];

        let spl_account = await connection.getParsedTokenAccountsByOwner(new PublicKey(nativeAddress), { mint: new PublicKey(mint_address_object.mint) })

        let splAccount = JSON.parse(JSON.stringify(spl_account));

        console.log(splAccount);

        if (splAccount.value.length != 0) {

            let spl_account_pubkey = splAccount.value[0].pubkey;

            finalSearchAddressList.push({
                pubkey: new PublicKey(spl_account_pubkey),
                mint: mint_address_object.mint,
                name: mint_address_object.name,
            })
        }
        
    }
    return finalSearchAddressList;
}

let solprice = 0;
let usdcprice = 0;

const loadTransactions = async (nativeAddress: any, acceptedSPLMintAddressList: any, numTx: any) => {

    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=157fd975-3c41-4ae2-96f1-d1f9cf769aad');

    console.log(`✅ Connected!`)

    let finalSearchAddressList = await loadSearchAddressList(connection, nativeAddress, acceptedSPLMintAddressList);

    if (solprice == 0 || usdcprice == 0) {

        try {
            if (!Moralis.Core.isStarted) {
                await Moralis.start({
                    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjE3MmQxZjgxLWJkOGItNDQxZS1hNDMyLWJmYTNjNjcxMmVjNCIsIm9yZ0lkIjoiMzg3MTI2IiwidXNlcklkIjoiMzk3NzcxIiwidHlwZUlkIjoiYmY3OTE2MTctZjMyMS00ZjI1LThkODQtYjViN2I4MGJmZDk4IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MTI2NDk1MTYsImV4cCI6NDg2ODQwOTUxNn0.XNV1FV7292MqRXdJBxyzPI28XKWv_0N4LWfFYnxHDaQ"
                });
            }

            if (solprice == 0) {
      
                const response = await Moralis.SolApi.token.getTokenPrice({
                    "network": "mainnet",
                    "address": "So11111111111111111111111111111111111111112"
                });
      
                console.log(response.raw);
                solprice = Number(response.raw.usdPrice);
                console.log(solprice);
            }
            if (usdcprice == 0) {
      
                const response = await Moralis.SolApi.token.getTokenPrice({
                    "network": "mainnet",
                    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                });
      
                console.log(response.raw);
                usdcprice = Number(response.raw.usdPrice);
                console.log(solprice);
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    console.log(JSON.stringify(finalSearchAddressList));

    console.log(finalSearchAddressList);
    
    let transferTransactionList: any[] = [];

    for (var x = 0; x < finalSearchAddressList.length; x++) {

        console.log("in loop");

        let searchAddressObject = finalSearchAddressList[x];

        let pubKey = searchAddressObject.pubkey;
        let mintAdd = searchAddressObject.mint;
        let name = searchAddressObject.name;

        //fetching transaction info on each address
        let transactionList = await connection.getSignaturesForAddress(pubKey, { limit: numTx });
        let signatureList = transactionList.map(transaction => transaction.signature);
        let transactionDetails = await connection.getParsedTransactions(signatureList, {
            maxSupportedTransactionVersion: 0,
        });

        //reading transaction info
        transactionList.forEach((transaction, i) => {
            const date = new Date(transaction.blockTime! * 1000);
            const transactionInstructions = transactionDetails[i]?.transaction.message.instructions;
            const transactionInstructionsJSON = JSON.parse(JSON.stringify(transactionInstructions));

            transactionInstructionsJSON?.forEach((instruction: any, n: any) => {
                //native solana tracking
                if (x == 0 && instruction.parsed && instruction.parsed.type == 'transfer' && instruction.parsed.info.lamports) {
                    try {
                        const lamports = instruction.parsed.info.lamports;
                        const destination = instruction.parsed.info.destination;
                        const source = instruction.parsed.info.source;

                        if (destination == pubKey && transaction.confirmationStatus == 'finalized' && lamports > 0) {
                        
                            transferTransactionList.push({
                                time: date,
                                signature: transaction.signature,
                                source: source,
                                destination: destination,
                                token: name,
                                uiAmount: lamports / LAMPORTS_PER_SOL,
                                price: parseFloat(((lamports / LAMPORTS_PER_SOL)*solprice).toFixed(2))
                            })

                            //console.log(transferTransactionList);
                        }
                    }
                    catch (e: any) {
                        console.log(e.message);
                    }
                }
                //USDC
                else if (x > 0 && instruction.parsed! && instruction.parsed.type == 'transferChecked' && instruction.parsed.info.tokenAmount.uiAmount!) {
                    try {
                        const uiAmount = instruction.parsed.info.tokenAmount.uiAmount;
                        const destination = instruction.parsed.info.destination;
                        const mint = instruction.parsed.info.mint;
                        const source = instruction.parsed.info.source;

                        if (destination == pubKey && transaction.confirmationStatus == 'finalized' && uiAmount > 0 && mint == mintAdd) {
                            transferTransactionList.push({
                                time: date,
                                signature: transaction.signature,
                                source: source,
                                destination: destination,
                                token: name,
                                uiAmount: uiAmount,
                                price: parseFloat((uiAmount*usdcprice).toFixed(2))
                            })
                            console.log(transferTransactionList);
                        }
                    }
                    catch (e) {
                        console.log(e);
                    }
                }

            })
        })

    }
    console.log(JSON.stringify(transferTransactionList));
    return (transferTransactionList);
}

const app = express();
app.use(cors({ origin: true }));

app.get("/getLogs", async (req: any, res: any) => {
    let address = req.query.address;
    if (!address) {
        return res.status(500).send({
            status: "Failed",
            message: "address parameter in request body not found",
        });
    }
    console.log(address);

    //hardcoded to check for only USDC
    const acceptedSPLMintAddressList = [
        {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            name: 'USDC'
        }]
    try {
        let transferTransactionList = await loadTransactions(address, acceptedSPLMintAddressList, 50);
    
        return res.status(200).send({
            status: "Success",
            txlist: transferTransactionList,
        });

    }
    catch (e: any) {
        return res.status(500).send({
            status: "Failed",
            message: e.message,
        });
    }
    
});

// app.listen(3000, function () {
//     console.log("Server running on port 3000")
// })

exports.soltxnlogs = onRequest(app);
