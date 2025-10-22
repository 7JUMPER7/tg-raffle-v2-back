export const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const checkReferralCode = (code: string) => {
    code = code.toLowerCase();
    const regex = new RegExp("^[a-zA-Z0-9]+$");
    if (regex.test(code) && code.length === 8) {
        return true;
    }
    return false;
};
