# BSB GO

## Instalacao
Primeiro é preciso garantir que as dependências necessárias estão instaladas:

``` shell
# Firebase cli
npm install -g firebase-tools
firebase login # Logar com a conta do CEUB para poder acessar o BSB GO
firebase --version

# Node v12
node -v

# Typescript
tsc -v
```

## Emulador
Para rodar o emulador, basta seguir os seguintes comandos:

```shell
cd functions
npm install
npm run build && firebase emulators:start --import ./bsbgo-f60da.appspot.com/2020-11-03T21:26:54_61352/
```
