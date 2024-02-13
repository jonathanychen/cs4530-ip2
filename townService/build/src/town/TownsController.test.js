import assert from 'assert';
import { mockDeep } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import TownsStore from '../lib/TownsStore';
import { createConversationForTesting, getLastEmittedEvent, extractSessionToken, mockPlayer, isViewingArea, isConversationArea, } from '../TestUtils';
import { TownsController } from './TownsController';
function expectTownListMatches(towns, town) {
    const matching = towns.find(townInfo => townInfo.townID === town.townID);
    if (town.isPubliclyListed) {
        expect(matching).toBeDefined();
        assert(matching);
        expect(matching.friendlyName).toBe(town.friendlyName);
    }
    else {
        expect(matching).toBeUndefined();
    }
}
const broadcastEmitter = jest.fn();
describe('TownsController integration tests', () => {
    let controller;
    const createdTownEmitters = new Map();
    async function createTownForTesting(friendlyNameToUse, isPublic = false) {
        const friendlyName = friendlyNameToUse !== undefined
            ? friendlyNameToUse
            : `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
        const ret = await controller.createTown({
            friendlyName,
            isPubliclyListed: isPublic,
            mapFile: 'testData/indoors.json',
        });
        return {
            friendlyName,
            isPubliclyListed: isPublic,
            townID: ret.townID,
            townUpdatePassword: ret.townUpdatePassword,
        };
    }
    function getBroadcastEmitterForTownID(townID) {
        const ret = createdTownEmitters.get(townID);
        if (!ret) {
            throw new Error(`Could not find broadcast emitter for ${townID}`);
        }
        return ret;
    }
    beforeAll(() => {
        process.env.TWILIO_API_AUTH_TOKEN = 'testing';
        process.env.TWILIO_ACCOUNT_SID = 'ACtesting';
        process.env.TWILIO_API_KEY_SID = 'testing';
        process.env.TWILIO_API_KEY_SECRET = 'testing';
    });
    beforeEach(async () => {
        createdTownEmitters.clear();
        broadcastEmitter.mockImplementation((townID) => {
            const mockRoomEmitter = mockDeep();
            createdTownEmitters.set(townID, mockRoomEmitter);
            return mockRoomEmitter;
        });
        TownsStore.initializeTownsStore(broadcastEmitter);
        controller = new TownsController();
    });
    describe('createTown', () => {
        it('Allows for multiple towns with the same friendlyName', async () => {
            const firstTown = await createTownForTesting();
            const secondTown = await createTownForTesting(firstTown.friendlyName);
            expect(firstTown.townID).not.toBe(secondTown.townID);
        });
        it('Prohibits a blank friendlyName', async () => {
            await expect(createTownForTesting('')).rejects.toThrowError();
        });
    });
    describe('listTowns', () => {
        it('Lists public towns, but not private towns', async () => {
            const pubTown1 = await createTownForTesting(undefined, true);
            const privTown1 = await createTownForTesting(undefined, false);
            const pubTown2 = await createTownForTesting(undefined, true);
            const privTown2 = await createTownForTesting(undefined, false);
            const towns = await controller.listTowns();
            expectTownListMatches(towns, pubTown1);
            expectTownListMatches(towns, pubTown2);
            expectTownListMatches(towns, privTown1);
            expectTownListMatches(towns, privTown2);
        });
        it('Allows for multiple towns with the same friendlyName', async () => {
            const pubTown1 = await createTownForTesting(undefined, true);
            const privTown1 = await createTownForTesting(pubTown1.friendlyName, false);
            const pubTown2 = await createTownForTesting(pubTown1.friendlyName, true);
            const privTown2 = await createTownForTesting(pubTown1.friendlyName, false);
            const towns = await controller.listTowns();
            expectTownListMatches(towns, pubTown1);
            expectTownListMatches(towns, pubTown2);
            expectTownListMatches(towns, privTown1);
            expectTownListMatches(towns, privTown2);
        });
    });
    describe('deleteTown', () => {
        it('Throws an error if the password is invalid', async () => {
            const { townID } = await createTownForTesting(undefined, true);
            await expect(controller.deleteTown(townID, nanoid())).rejects.toThrowError();
        });
        it('Throws an error if the townID is invalid', async () => {
            const { townUpdatePassword } = await createTownForTesting(undefined, true);
            await expect(controller.deleteTown(nanoid(), townUpdatePassword)).rejects.toThrowError();
        });
        it('Deletes a town if given a valid password and town, no longer allowing it to be joined or listed', async () => {
            const { townID, townUpdatePassword } = await createTownForTesting(undefined, true);
            await controller.deleteTown(townID, townUpdatePassword);
            const { socket } = mockPlayer(townID);
            await controller.joinTown(socket);
            expect(socket.emit).not.toHaveBeenCalled();
            expect(socket.disconnect).toHaveBeenCalled();
            const listedTowns = await controller.listTowns();
            if (listedTowns.find(r => r.townID === townID)) {
                fail('Expected the deleted town to no longer be listed');
            }
        });
        it('Informs all players when a town is destroyed using the broadcast emitter and then disconnects them', async () => {
            const town = await createTownForTesting();
            const players = await Promise.all([...Array(10)].map(async () => {
                const player = mockPlayer(town.townID);
                await controller.joinTown(player.socket);
                return player;
            }));
            const townEmitter = getBroadcastEmitterForTownID(town.townID);
            await controller.deleteTown(town.townID, town.townUpdatePassword);
            getLastEmittedEvent(townEmitter, 'townClosing');
            players.forEach(eachPlayer => expect(eachPlayer.socket.disconnect).toBeCalledWith(true));
        });
    });
    describe('updateTown', () => {
        it('Checks the password before updating any values', async () => {
            const pubTown1 = await createTownForTesting(undefined, true);
            expectTownListMatches(await controller.listTowns(), pubTown1);
            await expect(controller.updateTown(pubTown1.townID, `${pubTown1.townUpdatePassword}*`, {
                friendlyName: 'broken',
                isPubliclyListed: false,
            })).rejects.toThrowError();
            expectTownListMatches(await controller.listTowns(), pubTown1);
        });
        it('Updates the friendlyName and visbility as requested', async () => {
            const pubTown1 = await createTownForTesting(undefined, false);
            expectTownListMatches(await controller.listTowns(), pubTown1);
            await controller.updateTown(pubTown1.townID, pubTown1.townUpdatePassword, {
                friendlyName: 'newName',
                isPubliclyListed: true,
            });
            pubTown1.friendlyName = 'newName';
            pubTown1.isPubliclyListed = true;
            expectTownListMatches(await controller.listTowns(), pubTown1);
        });
        it('Should fail if the townID does not exist', async () => {
            await expect(controller.updateTown(nanoid(), nanoid(), { friendlyName: 'test', isPubliclyListed: true })).rejects.toThrow();
        });
    });
    describe('joinTown', () => {
        it('Disconnects the socket if the town does not exist', async () => {
            await createTownForTesting(undefined, true);
            const { socket } = mockPlayer(nanoid());
            await controller.joinTown(socket);
            expect(socket.emit).not.toHaveBeenCalled();
            expect(socket.disconnect).toHaveBeenCalled();
        });
        it('Admits a user to a valid public or private town and sends back initial data', async () => {
            const joinAndCheckInitialData = async (publiclyListed) => {
                const town = await createTownForTesting(undefined, publiclyListed);
                const player = mockPlayer(town.townID);
                await controller.joinTown(player.socket);
                expect(player.socket.emit).toHaveBeenCalled();
                expect(player.socket.disconnect).not.toHaveBeenCalled();
                const initialData = getLastEmittedEvent(player.socket, 'initialize');
                expect(initialData.friendlyName).toEqual(town.friendlyName);
                expect(initialData.isPubliclyListed).toEqual(publiclyListed);
                expect(initialData.interactables.length).toBeGreaterThan(0);
                expect(initialData.providerVideoToken).toBeDefined();
                expect(initialData.sessionToken).toBeDefined();
                expect(initialData.currentPlayers.length).toBe(1);
                expect(initialData.currentPlayers[0].userName).toEqual(player.userName);
                expect(initialData.currentPlayers[0].id).toEqual(initialData.userID);
            };
            await joinAndCheckInitialData(true);
            await joinAndCheckInitialData(false);
        });
        it('Includes active conversation areas in the initial join data', async () => {
            const town = await createTownForTesting(undefined, true);
            const player = mockPlayer(town.townID);
            await controller.joinTown(player.socket);
            const initialData = getLastEmittedEvent(player.socket, 'initialize');
            const conversationArea = createConversationForTesting({
                boundingBox: { x: 10, y: 10, width: 1, height: 1 },
                conversationID: initialData.interactables.find(eachInteractable => isConversationArea(eachInteractable))?.id,
            });
            await controller.createConversationArea(town.townID, extractSessionToken(player), conversationArea);
            const player2 = mockPlayer(town.townID);
            await controller.joinTown(player2.socket);
            const initialData2 = getLastEmittedEvent(player2.socket, 'initialize');
            const createdArea = initialData2.interactables.find(eachInteractable => eachInteractable.id === conversationArea.id);
            expect(createdArea.topic).toEqual(conversationArea.topic);
            expect(initialData2.interactables.length).toEqual(initialData.interactables.length);
        });
    });
    describe('Interactables', () => {
        let testingTown;
        let player;
        let sessionToken;
        let interactables;
        beforeEach(async () => {
            testingTown = await createTownForTesting(undefined, true);
            player = mockPlayer(testingTown.townID);
            await controller.joinTown(player.socket);
            const initialData = getLastEmittedEvent(player.socket, 'initialize');
            sessionToken = initialData.sessionToken;
            interactables = initialData.interactables;
        });
        describe('Create Conversation Area', () => {
            it('Executes without error when creating a new conversation', async () => {
                await controller.createConversationArea(testingTown.townID, sessionToken, createConversationForTesting({
                    conversationID: interactables.find(isConversationArea)?.id,
                }));
            });
            it('Returns an error message if the town ID is invalid', async () => {
                await expect(controller.createConversationArea(nanoid(), sessionToken, createConversationForTesting())).rejects.toThrow();
            });
            it('Checks for a valid session token before creating a conversation area', async () => {
                const conversationArea = createConversationForTesting();
                const invalidSessionToken = nanoid();
                await expect(controller.createConversationArea(testingTown.townID, invalidSessionToken, conversationArea)).rejects.toThrow();
            });
            it('Returns an error message if addConversation returns false', async () => {
                const conversationArea = createConversationForTesting();
                await expect(controller.createConversationArea(testingTown.townID, sessionToken, conversationArea)).rejects.toThrow();
            });
        });
        describe('[T1] Create Viewing Area', () => {
            it('Executes without error when creating a new viewing area', async () => {
                const viewingArea = interactables.find(isViewingArea);
                if (!viewingArea) {
                    fail('Expected at least one viewing area to be returned in the initial join data');
                }
                else {
                    const newViewingArea = {
                        elapsedTimeSec: 100,
                        id: viewingArea.id,
                        video: nanoid(),
                        isPlaying: true,
                        occupants: [],
                        type: 'ViewingArea',
                    };
                    await controller.createViewingArea(testingTown.townID, sessionToken, newViewingArea);
                    const townEmitter = getBroadcastEmitterForTownID(testingTown.townID);
                    const updateMessage = getLastEmittedEvent(townEmitter, 'interactableUpdate');
                    if (isViewingArea(updateMessage)) {
                        expect(updateMessage).toEqual(newViewingArea);
                    }
                    else {
                        fail('Expected an interactableUpdate to be dispatched with the new viewing area');
                    }
                }
            });
            it('Returns an error message if the town ID is invalid', async () => {
                const viewingArea = interactables.find(isViewingArea);
                const newViewingArea = {
                    elapsedTimeSec: 100,
                    id: viewingArea.id,
                    video: nanoid(),
                    isPlaying: true,
                    occupants: [],
                    type: 'ViewingArea',
                };
                await expect(controller.createViewingArea(nanoid(), sessionToken, newViewingArea)).rejects.toThrow();
            });
            it('Checks for a valid session token before creating a viewing area', async () => {
                const invalidSessionToken = nanoid();
                const viewingArea = interactables.find(isViewingArea);
                const newViewingArea = {
                    elapsedTimeSec: 100,
                    id: viewingArea.id,
                    video: nanoid(),
                    isPlaying: true,
                    occupants: [],
                    type: 'ViewingArea',
                };
                await expect(controller.createViewingArea(testingTown.townID, invalidSessionToken, newViewingArea)).rejects.toThrow();
            });
            it('Returns an error message if addViewingArea returns false', async () => {
                const viewingArea = interactables.find(isViewingArea);
                viewingArea.id = nanoid();
                await expect(controller.createViewingArea(testingTown.townID, sessionToken, viewingArea)).rejects.toThrow();
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG93bnNDb250cm9sbGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdG93bi9Ub3duc0NvbnRyb2xsZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFpQixRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBR2hDLE9BQU8sVUFBVSxNQUFNLG1CQUFtQixDQUFDO0FBQzNDLE9BQU8sRUFDTCw0QkFBNEIsRUFDNUIsbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixVQUFVLEVBQ1YsYUFBYSxFQUNiLGtCQUFrQixHQUVuQixNQUFNLGNBQWMsQ0FBQztBQUN0QixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFTcEQsU0FBUyxxQkFBcUIsQ0FBQyxLQUFhLEVBQUUsSUFBa0I7SUFDOUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pFLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNqQixNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDeEQsQ0FBQztTQUFNLENBQUM7UUFDTixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDbkMsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUs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