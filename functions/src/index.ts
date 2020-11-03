import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as firebase from '@google-cloud/firestore';

admin.initializeApp();

interface User {
  nome: string,
  pontuacao: number,
}

interface Circuit {
  id: string,
  nome: string,
  descricao: string,
  pontuacao: number,
  macropontos: string[],
}

export const addNewUserToFirebase = functions.auth.user().onCreate((user) => {
  // O nome padrao vai ser o handler do email do usuario
  const defaultName = user.displayName || user.email?.split("@")[0] || "defaultName"

  const newUser: User = {
    nome: defaultName,
    pontuacao: 0
  }

  return admin.firestore()
    .collection("usuarios")
    .doc(user.uid)
    .set(newUser);
});

export const getAllCircuits = functions.https.onRequest((_req, res) => {
  const circuits: Circuit[] = [];

  admin.firestore()
    .collection("circuitos")
    .get()
    .then((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();
        const macropontos: string[] = (data.macropontos as [firebase.DocumentReference]).map(macroponto => {
          return macroponto.path;
        })

        const circuit: Circuit = {
          id: doc.id,
          nome: data.nome as string,
          descricao: data.descricao as string,
          pontuacao: data.pontuacao as number,
          macropontos: macropontos
        }
        circuits.push(circuit)
      });

      return res.status(200).send(circuits)
    })
    .catch((error) => {
      console.log(error);
      return res.status(400).send("Deu ruim")
    })

});


export const getGeopointsForUser = functions.https.onRequest((req, res) => {
  // busca o id do usuario no body da call
  const userId = req.body.id

  admin.firestore()
    .collection("usuarios")
    .doc(`${userId}/circuitos_andamento/torre_tv`)
    .get()
    .then((data) => {
      const values = data.data();
      console.log(values);
      res.status(200).send(`Ola ${userId}`);
    })
    .catch((error) => {
      console.log(error);
      return res.status(400).send(error);
    })

});


