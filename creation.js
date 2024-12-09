import { _FKS_ } from "./models.js";


export class ForeignKeyCreator {
    constructor(mongoModel) {
        this.mongoModel = mongoModel;
        this.modelName = this.mongoModel.modelName;
        this.fksModels = Object.entries(this.mongoModel.__FKS__);
        this.relations = [];
        this.promisesCreateFks = [];
    }

    async _creationFks(instance) {
        try {
            await this._createFks(instance);
        } catch (error) {
            await this._cleanupRelations();
            throw error;
        }
    }

    async create(models) {
        if (!Array.isArray(models)) models = [models];

        try {
            models.map(async model => {
                const relations = await this._creationFks(model);
                model.__relations = relations;
            });
            
            await Promise.all(promisesCreateFks);
        } catch (error) {
            await this._cleanupModels(models);
            throw error;
        }
    }

    async _createFks(instance) {
        const modelId = instance._id;

        for (const [key, value] of this.fksModels) {
            if (!value.activated) continue;

            let ids = instance[key];
            if (!Array.isArray(ids)) ids = [ids];

            const uniqueCheckPromises = ids.map(id => this._ensureUnique(value, id, modelId));
            await Promise.all(uniqueCheckPromises);

            this.promisesCreateFks.push(
                ...ids.map(id => this._createRelation(modelId, id, value, relations))
            );
        }
    }

    async _ensureUnique(fk, id, modelId) {
        const existingRelation = await _FKS_.findOne({
            parent_ref: this.modelName,
            parent_id: modelId,
            child_ref: fk.ref,
            child_id: id,
            child_fullPath: fk.fullPath
        }).lean();

        if (existingRelation) throw new Error("Relation already exists");
    }

    async _createRelation(modelId, childId, value) {
        const fkRelation = await _FKS_.create({
            parent_id: modelId,
            parent_ref: this.modelName,
            child_id: childId,
            child_ref: value.fullName,
            child_fullPath: value.fullPath
        });

        this.relations.push(fkRelation);
    }

    async _cleanupRelations() {
        const relationIds = this.relations.map(relation => relation._id);
        await _FKS_.deleteMany({ _id: { $in: relationIds } });
    }

    async _cleanupModels(models) {
        const modelIds = models.map(model => model._id);
        await this.mongoModel.deleteMany({ _id: { $in: modelIds } });
    }
}
