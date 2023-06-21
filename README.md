# zkSync local development setup

## Install Dependencies 

### Installing Docker
original guide here : https://docs.docker.com/engine/install/ubuntu/#installation-methods

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-compose
```

To run docker commands without sudo, run:
```bash
sudo adduser $USER docker
```
Log out and log back in so that your group membership is re-evaluated.
 

Verify that the Docker Engine installation is successful by running the hello-world image.
```bash
docker run hello-world
```

### Install latest Node.js LTS version and Yarn

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

Log out and log back in.

```bash
nvm install --lts
npm install --global yarn
```




## Change dummy prover/verifier to false in zksync server docker image
Skip to [Start Test Net] if you want to stick to the default dummy prover 

Update image
```bash
docker build -f zksync-image-update -t using-real-prover-verifier .
```

Verify the new image exist
```bash
docker image ls
```

Update docker-compose.yml
```bash
sed -i  -e 's/matterlabs\/local-node:latest2.0/using-real-prover-verifier/g' docker-compose.yml
```

## Start Test Net
```bash
./start
```


## test example
```bash
cd local-setup-testing
npm install
yarn test 
```



## bulk transfer example

### Setup : 
```bash
cd bulk-transfer-test
npm install
```

### Show rich wallet balances
```bash
npx hardhat balance --accounts-file wallets/rich-wallet.json
```

### Split one or more account N times 
Example below : split the rich wallet (0x74d8b3a188f7260f67698eb44da07397a298df5427df681ef68c45b34b61f998) balance 10 times - creating a total of 1024 accounts saved in wallets/split.json
```bash
npx hardhat split --account "0x74d8b3a188f7260f67698eb44da07397a298df5427df681ef68c45b34b61f998" --iterations 10 --output-file wallets/split.json
```

### Send bulk transfer transactions 
Example below : sends 100 transfer per bulk transfer between accounts listed in wallets/split.json. Whole process is repeated 2 times
```bash
npx hardhat bulkTx --accounts-file wallets/split.json --transfers 100 --iterations 2 
```