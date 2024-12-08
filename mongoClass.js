import mongoose from "mongoose";
import { ForeignKeyProcessor } from "./generateModel.js";
import { _FKS_MODEL_ } from "./models.js";
import { getFuncs, changeCreation, changeDeletion } from "./changeFuncs.js";

export class SyncedModels {
    constructor() {
        this.syncModels = {};
    }

    get() {
        // Retorna uma cópia do estado sincronizado
        return { ...this.syncModels };
    }

    _addVerifyError(key, oldModels) {
        // Verifica se a chave já existe no modelo sincronizado e lança erro se necessário
        if (key in this.syncModels) {
            this.syncModels = oldModels;
            throw new Error("Synced model already exists for key: " + key);
        }
    }

    set(models) {
        // Define o estado sincronizado com novos modelos, sobrescrevendo qualquer existente
        const oldModels = this.get();
        const newModels = {};

        for (const [key, value] of models) {
            this._addVerifyError(key, oldModels);
            newModels[key] = value;
        }

        this.syncModels = newModels;
    }

    add(models) {
        // Adiciona novos modelos ao estado sincronizado
        const oldModels = this.get();

        for (const [key, value] of models) {
            this._addVerifyError(key, oldModels);
            this.syncModels[key] = value;
        }
    }
}

export const InitMongoModels = async() => {
    const syncModels = new SyncedModels();
    return syncModels;
};

export const MongoModel = async(
    name,
    schema,
    collection,
    options
) => {
    if (name in syncModels) throw new Error("Model name already exists");

    const mongoModel = mongoose.model(name, schema, collection, options);

    const foreignKeyProcessor = new ForeignKeyProcessor({
        mongoModel: mongoModel,
        _FKS_MODEL_: _FKS_MODEL_
    });
    await foreignKeyProcessor.processForeignKeys();

    //const oldFuncs = await getFuncs(mongoModel);
    //await changeCreation(mongoModel, oldFuncs);
    //await changeDeletion(mongoModel, oldFuncs);

    syncModels[mongoModel.modelName] = mongoModel;
    return mongoModel;
};
