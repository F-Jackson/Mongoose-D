/* eslint-disable max-len */
/* eslint-disable no-undef */
import { _FKS_ } from "./models.js";


export class ForeignKeyDeleter {
    constructor(mongoModel) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.fksModels = Object.entries(mongoModel.__FKS__);
    }

    async deletionFks(instance) {
        const requiredRelations = [];
        const immutableRelations = [];
        const normalRelations = [];

        try {
            const fksModels = await _FKS_.find({ fk_ref: this.modelName });

            for (const fksModel of fksModels) {
                const relations = await _FKS_.find({
                    child_id: instance._id,
                    parent_ref: fksModel.model,
                });

                this.categorizeRelations(
                    relations, 
                    fksModel, 
                    requiredRelations, 
                    immutableRelations, 
                    normalRelations
                );
            }

            await this.handleImmutableRelations(immutableRelations);
        } catch (error) {
            console.error("Error during deletionFks:", error);
            throw error;
        }
    }

    async deletionFunc(models) {
        if (!Array.isArray(models)) models = [models];

        for (const instance of models) {
            await this.deletionFks(instance);

            await _FKS_.deleteMany({ parent_id: instance._id });
            await _FKS_.deleteMany({ child_id: instance._id });
        }
    }

    categorizeRelations(relations, fksModel, requiredRelations, immutableRelations, normalRelations) {
        for (const relation of relations) {
            if (fksModel.fk_isRequired) {
                requiredRelations.push(relation);
            } else if (fksModel.fk_isImmutable) {
                immutableRelations.push(relation);
            } else {
                normalRelations.push(relation);
            }
        }
    }

    async handleImmutableRelations(immutableRelations) {
        for (const relation of immutableRelations) {
            // Implement logic to handle immutable relations as needed
            console.log("Handling immutable relation:", relation);
        }
    }
}
