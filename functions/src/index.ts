import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as firebase from '@google-cloud/firestore';
import * as models from './models';

admin.initializeApp();

export const addNewUserToFirebase = functions.auth.user().onCreate((user) => {
  const defaultName = user.displayName || user.email?.split("@")[0] || "defaultName"

  const newUser: models.User = {
    nome: defaultName,
    pontuacao: 0
  }

  return admin.firestore().doc(`usuarios/${user.uid}`).set(newUser);
});


export const addCircuitToUser = functions.https.onRequest(async (req, res) => {
  try {
    /*
    {
      "user_id": "asdald",
      "circuit": "centro_bsb"
    }
    */
    const userId = req.body.user_id as string;
    const circuitId = req.body.circuit as string;

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

    res.status(200).send("Ok");
  }
  catch (error) {
    console.log(error);
    res.status(500).send("Deu ruim")
  }

});


export const getAllCircuits = functions.https.onRequest((_req, res) => {
  const circuits: models.Circuit[] = [];

  admin.firestore().collection("circuitos").get()
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


// TODO: filtrar micropontos visitados
export const getGeopointsForUser = functions.https.onRequest(async (req, res) => {
  const userId = req.body.user_id as string;

  try {
    const circuits = await admin.firestore()
      .collection(`usuarios/${userId}/circuitos_andamento`)
      .where("circuito_finalizado", "==", false)
      .get();

    let micropontos: models.Microponto[] = [];
    circuits.docs.forEach(doc => {
      let data = doc.data().micropontos_restantes as models.Microponto[]
      data = data.map((mp, index) => {
        mp.circuito = doc.id;
        mp.id = index;
        return mp;
      });

      micropontos = micropontos.concat(data);
    });

    res.status(200).send(micropontos);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
});


export const checkPointAsVisited = functions.https.onRequest(async (req, res) => {
  const circuitId = req.body.circuito as string;
  const mpId = req.body.id as number;
  const userId = req.body.user_id as string;

  try {
    const docPath = `usuarios/${userId}/circuitos_andamento/${circuitId}`;
    const snap = await admin.firestore().doc(docPath).get();
    const data = snap.data() as models.CircuitInProgress;

    data.micropontos_restantes[mpId].visitado = true;

    await admin.firestore().doc(docPath).set(data);

    res.send();
  }
  catch (error) {
    console.log(error);
    res.status(400).send();
  }
});


export const getUserRanking = functions.https.onRequest(async (_req, res) => {
  let users: models.User[] = [];

  admin.firestore().collection("usuarios")
    .where("pontuacao", ">", 0).orderBy("pontuacao", "desc")
    .get()
  .then(snap => {
    snap.forEach(doc => {
      let user: models.User = {
        nome: doc.data().nome,
        pontuacao: doc.data().pontuacao,
      }
      users = users.concat(user);
    });

    res.status(200).send(users);
  })
  .catch(error => {
    console.log(error);
    res.status(400).send();
  });

});


export const getCircuitsForUser = functions.https.onRequest(async (req, res) => {
  const userId = req.body.user_id as String;

  try {
    const circuits = await admin.firestore()
      .collection(`usuarios/${userId}/circuitos_andamento`)
      .where("circuito_finalizado", "==", false)
      .get();

    let dataToSend: models.Circuit[] = [];
    circuits.docs.forEach(doc => {
      const data = doc.data() as models.Circuit;
      dataToSend = dataToSend.concat(data);
    })

    res.status(200).send(dataToSend);
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
});
