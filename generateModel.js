export class ForeignKeyProcessor {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
        this.activeForeignKeys = {};
        this.relations = [];
    }

    __mocktest = async (mocks) => {
        if (mocks) {
            Object.entries(mocks).forEach(([method, mockFunc]) => {
                this[method] = mockFunc;
            });
        }
    };

    processForeignKeys = async () => {
        await this._getActiveForeignKeys();
        await this._populateForeignKeyMetadata();
    };

    _getActiveForeignKeys = async () => {
        const schemaPaths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;
        console.log(`schema: ${JSON.stringify(schemaEntries)}`);

        await Promise.all(schemaPaths.map(([path, value]) => this._processPath(path, value, schemaEntries)));
    };

    getNestedProperty = async (obj, keys) => {
        return keys.reduce((current, key) => (current && key in current ? current[key] : undefined), obj);
    }

    _processPath = async (path, value, schemaEntries) => {
        const slicedKeys = path.split(".");
        const k = await this.getNestedProperty(schemaEntries, slicedKeys);
        console.log(`${path}: ${JSON.stringify(k)}`);
        const stack = [{ keys: slicedKeys, nested: [] }];
        let currentEntry = schemaEntries;
        let limit = 100;

        while (stack.length > 0) {
            limit--;
            if (limit < 1) throw new Error("Exceeded maximum iteration limit while processing path");

            const { keys, nested } = stack.pop();
            currentEntry = this._getNextSchemaEntry(currentEntry, keys[0]);

            if (!currentEntry) continue;

            if (this._isLeafNode(keys)) {
                console.log(path, currentEntry);
                await this._processLeafNode(path, currentEntry);
            } else {
                await this._addNestedKeyToStack(stack, keys, nested);
            }
        }
    };

    _getNextSchemaEntry = (currentEntry, key) => currentEntry[key];

    _isLeafNode = (keys) => keys.length === 1;

    _processLeafNode = async (path, schemaField) => {
        if (!schemaField.type) return;

        const { ref, isArray } = await this._extractFieldTypeAndRef(schemaField);
        if (!ref) return;

        const metadata = await this._createForeignKeyMetadata(path, schemaField, isArray);
        await this._addForeignKeyMetadata(ref, metadata);
    };

    _extractFieldTypeAndRef = async (schemaField) => {
        const isArray = Array.isArray(schemaField.type);
        const type = isArray ? schemaField.type[0] : schemaField.type;

        const linked = !("_linked" in schemaField && !schemaField["_linked"]);

        let ref = null; 
        if (type.schemaName === "ObjectId" && linked) {
            if (!schemaField["ref"]) throw new Error("Cant link without reference");

            ref = schemaField.ref;
        }

        return { type, ref, isArray };
    };

    _createForeignKeyMetadata = async (path, schemaField, isArray) => ({
        path,
        required: schemaField.required || false,
        immutable: schemaField.immutable || false,
        unique: schemaField.unique || false,
        array: isArray,
    });

    _addForeignKeyMetadata = async (ref, metadata) => {
        if (!this.activeForeignKeys[ref]) {
            this.activeForeignKeys[ref] = [];
            
            if (!this.relations.includes(ref)) {
                this.relations.push(ref);
            }
        }
        this.activeForeignKeys[ref].push(metadata);
    };

    _addNestedKeyToStack = async (stack, keys, nested) => {
        stack.push({
            keys: keys.slice(1),
            nested: [...nested, keys[0]],
        });
    };

    _populateForeignKeyMetadata = async () => {
        if (Object.keys(this.activeForeignKeys).length > 0) {
            this.mongoModel._FKS = this.activeForeignKeys;
        }

        const modelName = this.mongoModel.modelName;

        if (this.relations.length > 0) {
            try {
                this.mongoD.addRelations(this.relations, modelName);
            } catch (err) {
                this.mongoD.resetRelations();

                throw err;
            }
        }
    };
}
