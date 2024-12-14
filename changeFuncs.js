import mongoose from "mongoose";
import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";
import { _FKS_MODEL_ } from "./models.js";
import { deleteFromMongoose } from "./utils.js";


export const getFuncs = async(mongoModel) => {
    return {
        drop: mongoModel.collection.drop,
        create: mongoModel.create,
        save: mongoModel.prototype.save,
        insertMany: mongoModel.insertMany,
        deleteOne: mongoModel.deleteOne,
        deleteMany: mongoModel.deleteMany,
        findOneAndDelete: mongoModel.findOneAndDelete,
        findOneAndUpdate: mongoModel.findOneAndUpdate,
        updateMany: mongoModel.updateMany,
        updateOne: mongoModel.updateOne,
        replaceOne: mongoModel.replaceOne,
        findByIdAndUpdate: mongoModel.findByIdAndUpdate,
    };
};

export const changeDrop = async(mongoD, mongoModel, oldFuncs) => {
    mongoModel.collection.drop = async function(options) {
        const modelName = mongoModel.modelName;

        await deleteFromMongoose(modelName);

        const result = await oldFuncs.drop.call(this, options);

        const relations = mongoD.relations[modelName];
        if (relations) {
            relations.forEach(relation => {
                const relationModel = mongoD.models[relation];

                if (!relationModel || !relationModel["_FKS"]) return;

                delete relationModel._FKS[modelName];
                
                if (Object.entries(relationModel._FKS).length === 0) {
                    delete relationModel["_FKS"];
                }
            });

            delete mongoD.relations[modelName];
        }

        delete mongoD.models[modelName];

        return result;
    };
};

export const changeCreation = async(mongoModel, oldFuncs, mongoD) => {
    const createFunc = async(models) => {
        if (!mongoModel._FKS) return models;

        const creator = new ForeignKeyCreator(
            mongoModel, mongoD
        );
        return await creator.create(models, models);
    };

    mongoModel.create = async function(doc, callback) {
        const result = await oldFuncs.create.call(this, doc, callback);

        await createFunc(result);
        return result;
    };

    mongoModel.prototype.save = async function(doc, callback) {
        const result = await oldFuncs.save.call(this, doc, callback);

        return await createFunc(result, doc);
    };

    mongoModel.insertMany = async function(arr, options) {
        const result = await oldFuncs.insertMany.call(this, arr, options);

        return await createFunc(result, doc);
    };
};

export const changeDeletion = async(mongoModel, oldFuncs) => {
    const deleteFunc = async(models) => {
        const deleter = new ForeignKeyDeleter({
            mongoModel: mongoModel
        });
        await deleter.delete(models);
    };

    mongoModel.deleteOne = async function(conditions, options) {
        const result = await oldFuncs.deleteOne.call(this, conditions, options);

        return result;
    };

    mongoModel.deleteMany = async function(conditions, options) {
        const result = await oldFuncs.deleteMany.call(this, conditions, options);
        return result;
    };

    mongoModel.findOneAndDelete = async function(conditions, options) {
        const result = await oldFuncs.findOneAndDelete.call(this, conditions, options);

        await deleteFunc(result);

        return result;
    };
};
