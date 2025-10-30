// When lottery will exipre
// export const SECONDS_TO_EXPIRE = 30;
export const SECONDS_TO_EXPIRE = 10;

// Minimum number of users to start closing lottery
export const MIN_USERS_TO_CLOSE_LOTTERY = 2;

// Service fee (will take the most expensive gift <= x% of total gifts)
export const SERVICE_FEE_PERCENT = 10;

// Referral fee percentage (calculated from service fee)
export const REFERRAL_FEE_PERCENT = 30;

// Points amounts for different actions
export const POINTS_AMOUNT = {
    spin: 10,
    win: 300,
    subscribe: 100,
};

// Lottery spin animation length (ms)
export const LOTTERY_SPIN_ANIMATION_LENGTH = 11000;
