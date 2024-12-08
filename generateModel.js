export class ForeignKeyProcessor {
    constructor(mongoModel, _FKS_MODEL_) {
        this.mongoModel = mongoModel;
        this._FKS_MODEL_ = _FKS_MODEL_;
    }

    processForeignKeys = async() => {
        this.mongoModel.__FKS__ = {};

        const [activeFks, fksModels] = await Promise.all([
            this._getActiveForeignKeys(),
            this._fetchForeignKeyModels(),
        ]);

        this._populateForeignKeyMetadata(activeFks, fksModels);
    };

    _getActiveForeignKeys = async() => {
        const activeFks = [];
        const schemaEntries = Object.entries(this.mongoModel.schema.obj);

        const foreignKeys = schemaEntries.filter(([_, value]) => this._isForeignKey(value));

        for (const [key, value] of foreignKeys) {
            const { isArray, fkType } = this._getForeignKeyType(value);
            if (fkType.schemaName !== "ObjectId") continue;

            await this._findOrCreateForeignKeyModel(key, value, isArray);
            activeFks.push({ fk: key, ref: value.ref });
        }

        return activeFks;
    };

    _isForeignKey = (value) => {
        return value.type && value.__linked;
    };

    _getForeignKeyType = (value) => {
        const isArray = Array.isArray(value.type);
        const fkType = isArray ? value.type[0] : value.type;
        return { isArray, fkType };
    };

    _findOrCreateForeignKeyModel = async(key, value, isArray) => {
        let fksModel = await this._FKS_MODEL_.findOne({
            model: this.mongoModel.modelName,
            fk: key,
            fk_ref: value.ref,
        });

        if (!fksModel) {
            fksModel = await this._FKS_MODEL_.create({
                model: this.mongoModel.modelName,
                fk: key,
                fk_ref: value.ref,
                fk_isArray: isArray,
                fk_isImmutable: value.immutable,
                fk_isRequired: value.required,
                fk_isUnique: value.unique,
            });
        }

        return fksModel;
    };

    _fetchForeignKeyModels = async() => {
        return await this._FKS_MODEL_.find({ model: this.mongoModel.modelName });
    };

    _populateForeignKeyMetadata = (activeFks, fksModels) => {
        const activeFksMap = new Map(activeFks.map(fk => [`${fk.fk}:${fk.ref}`, true]));

        for (const fk of fksModels) {
            const isActive = activeFksMap.has(`${fk.fk}:${fk.fk_ref}`);
            this.mongoModel.__FKS__[fk.fk] = {
                _fk_ref: fk.fk_ref,
                _activated: isActive,
                _isArray: fk.fk_isArray,
                _isImmutable: fk.fk_isImmutable,
                _isRequired: fk.fk_isRequired,
                _isUnique: fk.fk_isUnique,
            };
        }
    };
}
