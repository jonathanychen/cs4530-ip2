import { ITiledMap } from '@jonbell/tiled-map-type-guard';
import * as fs from 'fs/promises';
import { customAlphabet } from 'nanoid';
import Town from '../town/Town';
function passwordMatches(provided, expected) {
    if (provided === expected) {
        return true;
    }
    if (process.env.MASTER_TOWN_PASSWORD && process.env.MASTER_TOWN_PASWORD === provided) {
        return true;
    }
    return false;
}
const friendlyNanoID = customAlphabet('1234567890ABCDEF', 8);
export default class TownsStore {
    static _instance;
    _towns = [];
    _emitterFactory;
    static initializeTownsStore(emitterFactory) {
        TownsStore._instance = new TownsStore(emitterFactory);
    }
    static getInstance() {
        if (TownsStore._instance === undefined) {
            throw new Error('TownsStore must be initialized before getInstance is called');
        }
        return TownsStore._instance;
    }
    constructor(emitterFactory) {
        this._emitterFactory = emitterFactory;
    }
    getTownByID(townID) {
        return this._towns.find(town => town.townID === townID);
    }
    getTowns() {
        return this._towns
            .filter(townController => townController.isPubliclyListed)
            .map(townController => ({
            townID: townController.townID,
            friendlyName: townController.friendlyName,
            currentOccupancy: townController.occupancy,
            maximumOccupancy: townController.capacity,
        }));
    }
    async createTown(friendlyName, isPubliclyListed, mapFile = '../frontend/public/assets/tilemaps/indoors.json') {
        if (friendlyName.length === 0) {
            throw new Error('FriendlyName must be specified');
        }
        const townID = process.env.DEMO_TOWN_ID === friendlyName ? friendlyName : friendlyNanoID();
        const newTown = new Town(friendlyName, isPubliclyListed, townID, this._emitterFactory(townID));
        const data = JSON.parse(await fs.readFile(mapFile, 'utf-8'));
        const map = ITiledMap.parse(data);
        newTown.initializeFromMap(map);
        this._towns.push(newTown);
        return newTown;
    }
    updateTown(townID, townUpdatePassword, friendlyName, makePublic) {
        const existingTown = this.getTownByID(townID);
        if (existingTown && passwordMatches(townUpdatePassword, existingTown.townUpdatePassword)) {
            if (friendlyName !== undefined) {
                if (friendlyName.length === 0) {
                    return false;
                }
                existingTown.friendlyName = friendlyName;
            }
            if (makePublic !== undefined) {
                existingTown.isPubliclyListed = makePublic;
            }
            return true;
        }
        return false;
    }
    deleteTown(townID, townUpdatePassword) {
        const existingTown = this.getTownByID(townID);
        if (existingTown && passwordMatches(townUpdatePassword, existingTown.townUpdatePassword)) {
            this._towns = this._towns.filter(town => town !== existingTown);
            existingTown.disconnectAllPlayers();
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG93bnNTdG9yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvVG93bnNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUQsT0FBTyxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN4QyxPQUFPLElBQUksTUFBTSxjQUFjLENBQUM7QUFHaEMsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjtJQUN6RCxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUMxQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNyRixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFTN0QsTUFBTSxDQUFDLE9BQU8sT0FBTyxVQUFVO0lBQ3JCLE1BQU0sQ0FBQyxTQUFTLENBQWE7SUFFN0IsTUFBTSxHQUFXLEVBQUUsQ0FBQztJQUVwQixlQUFlLENBQXFCO0lBRTVDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxjQUFrQztRQUM1RCxVQUFVLENBQUMsU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFPRCxNQUFNLENBQUMsV0FBVztRQUNoQixJQUFJLFVBQVUsQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2REFBNkQsQ0FBQyxDQUFDO1FBQ2pGLENB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