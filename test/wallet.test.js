const { Wallet } = require("../dist/modules/wallet");

function findAddressWithString(seed, string, i=0) {
    try {
        let r = Wallet.new(seed,i);
        if(r.address.toLowerCase().includes(string.toLowerCase())) {
            console.log(seed,i,r.address);
        } else {
            if(i<6969) findAddressWithString(seed,string,i+1);
            else findAddressWithString(Wallet.generateSeed(),string);
        }
    } catch {
        findAddressWithString(Wallet.generateSeed(),string);
    }
    
    // Not much else to do with a fresh random seed
}

// findAddressWithString(Wallet.generateSeed(),"elon"); // Don't try longer words than 4 characters, js is not the language for that

(async()=>{
    // Existing address test
    let w = await (Wallet.new("0000000000000000000000000000000000000000000000000000000000000000",0)).validate(); 
    let i = await w.account_info();
    console.log(i);
})();
