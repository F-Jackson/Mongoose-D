import { ForeignKeyCreator } from "./creation.js";
import { ForeignKeyDeleter } from "./deletion.js";
import { _FKS_MODEL_ } from "./models.js";


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
        const result = await oldFuncs.drop.call(this, options);

        if (result) {
            delete mongoD.models[mongoModel.modelName];
        }

        return result;
    };
};

export const changeCreation = async(mongoModel, oldFuncs) => {
    const createFunc = async(models) => {
        if (!mongoModel.__FKS__) return;

        const creator = new ForeignKeyCreator(
            mongoModel
        );
        await creator.create(models);
    };

    mongoModel.create = async function(options, callback) {
        const result = await oldFuncs.create.call(this, options, callback);

        await createFunc(result);

        return result;
    };

    mongoModel.prototype.save = async function(options, callback) {
        const result = await oldFuncs.save.call(this, options, callback);

        await createFunc(result);

        return result;
    };

    mongoModel.insertMany = async function(arr, options) {
        const result = await oldFuncs.insertMany.call(this, arr, options);

        await createFunc(result);

        return result;
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
