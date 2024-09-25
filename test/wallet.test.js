const { Wallet } = require("../dist/modules/wallet");

(async()=>{
    // Existing address test
    const wallet = await (Wallet.new("0000000000000000000000000000000000000000000000000000000000000000",0)).validate(); 
    const account = await wallet.accountInfo();
    
    console.log(account);
})();
