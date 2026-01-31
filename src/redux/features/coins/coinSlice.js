import { createAsyncThunk, createSlice, nanoid } from "@reduxjs/toolkit";
import axios from "axios";
import { walletAddress } from "../../../coinAddress/coinAddress";
import { setTransactionsFromFirestore } from "../transactions/transactionSlice";

const initialState = {
  loading: true,
  coins: [],
  error: "",
};

export const getAllCoins = createAsyncThunk(
  "coins/getAllCoins",
  async (_, { getState }) => {
    try {
      const response = await axios.get(
        "https://backend-trust-wall.vercel.app/api/coins",
      );
      // const response = await axios.get("http://localhost:5000/api/coins");

      const transaction = getState().transaction.transactions;

      return { coins: response.data, transaction };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
);

const coinSlice = createSlice({
  name: "coin",
  initialState,

  extraReducers: (builder) => {
    builder
      .addCase(getAllCoins.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAllCoins.fulfilled, (state, action) => {
        const { coins, transaction } = action.payload;
        const updateTheCoinList = coins.map((coin) => {
          const matchWalletAddress = walletAddress.find(
            (wallet) => wallet.slug.toLowerCase() === coin.slug.toLowerCase(),
          );

          const matchTransaction = transaction.filter(
            (transac) =>
              transac.coinSlug.toLowerCase() === coin.slug.toLowerCase(),
          );

          const calculateCoinTotalBalance = matchTransaction.reduce(
            (acc, transac) => {
              if (transac.status === "Completed") {
                if (transac.type === "Receive") {
                  return acc + transac.totalAmount;
                } else if (transac.type === "Send") {
                  return acc - transac.totalAmount;
                }
              }

              return acc;
            },
            0,
          );

          return {
            ...coin,
            addressCoins: matchWalletAddress
              ? matchWalletAddress.coinAddress
              : nanoid(),
            mininFeeAddressCoins: matchWalletAddress
              ? matchWalletAddress.mainFeeAddress
              : nanoid(),
            availableBalance: calculateCoinTotalBalance,
          };
        });
        state.loading = false;
        state.coins = updateTheCoinList;
        console.log(state.coins);
        state.error = "";
      })
      .addCase(getAllCoins.rejected, (state, action) => {
        state.loading = false;
        state.coins = null;
        state.error = action.error.message;
      })
      .addCase(setTransactionsFromFirestore, (state, action) => {
        const transactions = action.payload;
        state.coins = state.coins.map((coin) => {
          const matching = transactions.filter(
            (t) => t.coinSlug?.toLowerCase() === coin.slug?.toLowerCase(),
          );
          const availableBalance = matching.reduce((acc, t) => {
            if (t.status === "Completed") {
              return t.type === "Receive"
                ? acc + t.totalAmount
                : acc - t.totalAmount;
            }
            return acc;
          }, 0);

          return { ...coin, availableBalance };
        });
      });
  },
});

export const selectedCoinsLoading = (state) => state.coin.loading;
export const selectedCoins = (state) => state.coin.coins;
export const selectedCoinsError = (state) => state.coin.error;
export default coinSlice.reducer;
