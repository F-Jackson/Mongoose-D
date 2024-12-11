export class ForeignKeyProcessor {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.mongoD = mongoD;
        this.activeForeignKeys = {};
        this.relations = [];
    }

    processForeignKeys = async () => {
        await this._getActiveForeignKeys();
        await this._populateForeignKeyMetadata();
    };

    _getActiveForeignKeys = async () => {
        const schemaPaths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;

        await Promise.all(schemaPaths.map(([path]) => this._processPath(path, schemaEntries)));
    };

    _processPath = async (path, schemaEntries, ) => {
        const slicedKeys = path.split(".");
        const stack = [{ keys: slicedKeys, nested: [] }];
        let currentEntry = schemaEntries;

        while (stack.length > 0) {
            const { keys, nested } = stack.pop();
            currentEntry = this._getNextSchemaEntry(currentEntry, keys[0]);

            if (!currentEntry) continue;

            if (this._isLeafNode(keys)) {
                await this._processLeafNode(path, currentEntry);
            } else {
                await this._addNestedKeyToStack(stack, keys, nested);
            }
        }
    };

    _getNextSchemaEntry = (currentEntry, key) => currentEntry[key];

    _isLeafNode = (keys) => keys.length === 1;

    _processLeafNode = async (path, schemaField, ) => {
        if (!schemaField.type || !schemaField.ref) return;

        const { ref, isArray } = await this._extractFieldTypeAndRef(schemaField);
        if (!ref) return;

        const metadata = await this._createForeignKeyMetadata(path, schemaField, isArray);
        await this._addForeignKeyMetadata(ref, metadata);
    };

    _extractFieldTypeAndRef = async (schemaField) => {
        const isArray = Array.isArray(schemaField.type);
        const type = isArray ? schemaField.type[0] : schemaField.type;
        const linked = !("_linked" in schemaField && !schemaField["_linked"]);
        const ref = (type.schemaName === "ObjectId" && linked) ? schemaField.ref : null;
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
            this.relations.forEach(relation => {
                if (!this.mongoD.relations[relation]) {
                    this.mongoD.relations[relation] = [ modelName ];
                } else if (!this.mongoD.relations[relation].includes(modelName)) {
                    this.mongoD.relations[relation].push(modelName);
                }
            });
        }
    };
}
