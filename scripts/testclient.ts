import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { UXDController, PerpInteractor }from '@uxdprotocol/uxd-evm-client';

const market = "0x5802918dC503c465F969DA0847b71E3Fbe9B141c"
const collateral = "0x4200000000000000000000000000000000000006"
const ethAmount: number = 0.01
const uxdAmount = 5
const controllerAddress = "0xc3716fBE06EBFdd6F0741A9F3998ab03DA266AeE"
const uxdTokenAddress = "0x23901A57A4fE127ee5FfF31DdAB8FBAf83d0539C"
const rpcEndpoint = "https://kovan.optimism.io"
const chainId = 69

let signer: Signer;
let targetPrice: number = 0
let controller: UXDController
let perp: PerpInteractor

async function main() {
    await setup()
    await testMintWithEth()
}

async function setup() {
    const signers = await ethers.getSigners()
    signer = signers[0]

    const provider = new ethers.providers.JsonRpcProvider(rpcEndpoint)
    controller = new UXDController({
        provider,
        controller: controllerAddress,
        redeemable: uxdTokenAddress,
        market
    });
    perp = await PerpInteractor.initialize(rpcEndpoint, chainId)
}

async function testMint() {
    console.log('approving WETH')
    const approveTx = await controller.approveToken({
        contractAddress: collateral,
        spender: controllerAddress,
        amount: ethAmount,
        signer
    })
    await approveTx.wait()

    console.log('Minting with WETH')
    const mintTx = await controller.mint({
        amount: ethAmount,
        targetPrice,
        signer,
        collateral
    })
    console.log('mintTx = ', mintTx);
    await mintTx.wait();

    let uxdTotalSupply = await controller.getRedeemableMintCirculatingSupply()
    console.log('totalSupply = ', ethers.utils.formatEther(uxdTotalSupply));

    console.log('Redeeming WETH')
    const redeemTx = await controller.redeem({
        amount: uxdAmount,
        targetPrice,
        signer,
        collateral,
    })
    console.log('redeemTx = ', redeemTx)
    await redeemTx.wait();

    uxdTotalSupply = await controller.getRedeemableMintCirculatingSupply()
    console.log('totalSupply = ', ethers.utils.formatEther(uxdTotalSupply));
}

async function testMintWithEth() {
    const currentPrice = await perp.getMarkPrice("ETHUSD");
    targetPrice = currentPrice * 995/1000;
    console.log(`Minting with ETH. [currentPrice = ${currentPrice}, targetPrice = ${targetPrice}]`)
    const mintTx = await controller.mint({
        amount: ethAmount,
        targetPrice,
        signer
    });
    await mintTx.wait();
    console.log('mintTx = ', mintTx);

    let uxdTotalSupply = await controller.getRedeemableMintCirculatingSupply()
    console.log('totalSupply = ', ethers.utils.formatEther(uxdTotalSupply));
}

async function testRedeem() {
    const currentPrice = await perp.getMarkPrice("ETHUSD");
    targetPrice = currentPrice * 1005/1000;
    console.log(`Redeeming ETH. [currentPrice = ${currentPrice}, targetPrice = ${targetPrice}]`)
    const redeemTx = await controller.redeem({
        amount: ethAmount,
        targetPrice,
        signer,
        collateral,
    })
    await redeemTx.wait();
    console.log('redeemTx = ', redeemTx)

    let uxdTotalSupply = await controller.getRedeemableMintCirculatingSupply()
    console.log('totalSupply = ', ethers.utils.formatEther(uxdTotalSupply));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
