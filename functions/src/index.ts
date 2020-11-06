import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as firebase from '@google-cloud/firestore';
import * as models from './models';

admin.initializeApp();


export const addNewUserToFirebase = functions.auth.user().onCreate((user) => {
  // O nome padrao vai ser o handler do email do usuario
  const defaultName = user.displayName || user.email?.split("@")[0] || "defaultName"

  const newUser: models.User = {
    nome: defaultName,
    pontuacao: 0
  }

  return admin.firestore()
    .collection("usuarios")
    .doc(user.uid)
    .set(newUser);
});

export const addCircuitToUser = functions.https.onRequest(async (req, res) => {
  const userId = req.body.user_id as string;
  const circuitId = req.body.circuit as string;

  try {
    // Busca o circuito a ser adicionado
    const circuitSnapshot = await admin.firestore().doc(`circuitos/${circuitId}`).get();
    const circuitToAdd = circuitSnapshot.data() as models.Circuit;
    circuitToAdd.id = circuitId;

    // Busca todos os macropontos do circuito
    let promises: Promise<firebase.DocumentSnapshot<firebase.DocumentData>>[] = [];
    circuitToAdd.macropontos.forEach(macroponto => {
      const m = admin.firestore().doc(macroponto.path).get();
      promises.push(m);
    });
    const snapshots = await Promise.all(promises);

    // Cria um array de micropontos
    let micropontos: models.Microponto[] = [];
    snapshots.forEach(doc => {
      const data = doc.data() as models.Macroponto;
      micropontos = micropontos.concat(data.micropontos);
    });

    // Marca o campo visitado como false
    micropontos = micropontos.map(mp => {
      mp.visitado = false;
      return mp
    });

    // Adiciona o circuito em "usuarios/:user_id/circuitos_andamento/:circuit_id"
    await admin.firestore().doc(`usuarios/${userId}/circuitos_andamento/${circuitId}`).set({
      nome: circuitToAdd.nome,
      pontuacao: circuitToAdd.pontuacao,
      circuito_finalizado: false,
      micropontos_restantes: micropontos
    });

    res.status(200);
  }
  catch (error) {
    console.log(error);
    res.status(500).send("deu ruim")
  }
});

export const getAllCircuits = functions.https.onRequest((_req, res) => {
  const circuits: models.Circuit[] = [];

  admin.firestore()
    .collection("circuitos")
    .get()
    .then((snap) => {
      snap.forEach((doc) => {
        const data = doc.data();

        const circuit: models.Circuit = {
          id: doc.id,
          nome: data.nome as string,
          descricao: data.descricao as string,
          pontuacao: data.pontuacao as number,
          macropontos: data.macropontos
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


