const Twit = require('twit')
const fetch = require("node-fetch")
const moment = require('moment')
require('dotenv').config()

const T = new Twit({
    consumer_key:         process.env.TWITTER_API_KEY,
    consumer_secret:      process.env.TWITTER_API_SECRET,
    access_token:         process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
    timeout_ms:           60*1000,
    strictSSL:            true,
})

const immutableQuery = `
    {
        listTransactionsV2(address: "0xa7aefead2f25972d80516628417ac46b3f2604af", limit: 8000, txnType: "transfer") {
        items {
          txn_time
          txn_id
          transfers {
            from_address
            to_address
            token {
              type
              token_id
              usd_rate
            }
          }
        }
        nextToken
        scannedCount
      }
    }
`

exports.getTransactions = () => {
    fetch('https://3vkyshzozjep5ciwsh2fvgdxwy.appsync-api.us-west-2.amazonaws.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.IMX_KEY
        },
        body: JSON.stringify({ query: immutableQuery})
    })
        .then(data => data.json())
        .then(data => {
            const endDate = new Date(+data.data.listTransactionsV2.items[0].txn_time)
            const transactionlength = data.data.listTransactionsV2.items.length
            const startDate = new Date (+data.data.listTransactionsV2.items[transactionlength - 1].txn_time)
            const hourDiff = moment(startDate).diff(moment(endDate), "hours");

            console.log('runnin')

            // Grab the transaction items
            const immutascanTransactions = data.data.listTransactionsV2.items

            // Grab the wallet addresses
            let wallets = []
            immutascanTransactions.map((wallet) => {
                wallets.push(wallet.transfers[0].from_address)
                wallets.push(wallet.transfers[0].to_address)
            })

            // Count how many times a wallet occurs
            let walletCountMap = wallets.reduce(
                (map, value) => { map.set(value, (map.get(value) || 0) +1); return map },
                new Map()
            )

            let walletAndCounts = []
            walletCountMap.forEach((count, value) => walletAndCounts.push({"value": value, "count": count}) )
            walletAndCounts.map((walletCount) => {

                // Define the threshold for suspect behaviour
                // ie: the amount of times a user buys/sells collectibles
                // NOTE: Could also be whale movements...
                const walletThreshold = 150

                if (walletCount.count > walletThreshold){

                    tweet = `⚠🤖 Suspicious WALLET activity 🤖⚠

Wallet:
https://immutascan.io/address/${walletCount.value}

Activity: 
Sent/Received ${walletCount.count} collectibles within the last ${Math.abs(hourDiff)} hours.`

                    T.post('statuses/update', { status: tweet }, function(err, data, response) {
                        console.log('Alerted twitter.')
                    })

                }
            })

            // Grab the token ids
            let tokens = []
            immutascanTransactions.map((token) => {
                tokens.push(token.transfers[0].token.token_id)
            })

            // Count how many times a token occurs in the transactions
            let countMap = tokens.reduce(
                (map, value) => {map.set(value, (map.get(value) || 0) + 1); return map},
                new Map()
            )

            let tokenAndCounts = []
            countMap.forEach((count, value) =>  tokenAndCounts.push({"value": value, "count": count}))

            // Define the threshold for what is suspcious
            const collectibleThreshold = 13

            tokenAndCounts.map((tokenCount) => {
                if (tokenCount.count > collectibleThreshold) {
                    tweet = `⚠🤖 Suspicious COLLECTIBLE activity 🤖⚠
                    
Token (Collectible): 
https://immutascan.io/address/0xa7aefead2f25972d80516628417ac46b3f2604af/${tokenCount.value}

Activity: 
Transferred ${tokenCount.count} times within the last ${Math.abs(hourDiff)} hours.`

                    T.post('statuses/update', { status: tweet }, () => {
                        console.log('Suspect found! I have alerted twitter.')
                    })
                }
            })

        })
        .catch(e => console.log('[ERROR]: Unable to get response from immutascan.', e))
}