import { nanoid } from 'nanoid';
import InvalidParametersError from '../lib/InvalidParametersError';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import { isViewingArea } from '../TestUtils';
import { logError } from '../Utils';
import ConversationArea from './ConversationArea';
import GameAreaFactory from './games/GameAreaFactory';
import ViewingArea from './ViewingArea';
export default class Town {
    get capacity() {
        return this._capacity;
    }
    set isPubliclyListed(value) {
        this._isPubliclyListed = value;
        this._broadcastEmitter.emit('townSettingsUpdated', { isPubliclyListed: value });
    }
    get isPubliclyListed() {
        return this._isPubliclyListed;
    }
    get townUpdatePassword() {
        return this._townUpdatePassword;
    }
    get players() {
        return this._players;
    }
    get occupancy() {
        return this.players.length;
    }
    get friendlyName() {
        return this._friendlyName;
    }
    set friendlyName(value) {
        this._friendlyName = value;
        this._broadcastEmitter.emit('townSettingsUpdated', { friendlyName: value });
    }
    get townID() {
        return this._townID;
    }
    get interactables() {
        return this._interactables;
    }
    _players = [];
    _videoClient = TwilioVideo.getInstance();
    _interactables = [];
    _townID;
    _friendlyName;
    _townUpdatePassword;
    _isPubliclyListed;
    _capacity;
    _broadcastEmitter;
    _connectedSockets = new Set();
    _chatMessages = [];
    constructor(friendlyName, isPubliclyListed, townID, broadcastEmitter) {
        this._townID = townID;
        this._capacity = 50;
        this._townUpdatePassword = nanoid(24);
        this._isPubliclyListed = isPubliclyListed;
        this._friendlyName = friendlyName;
        this._broadcastEmitter = broadcastEmitter;
    }
    async addPlayer(userName, socket) {
        const newPlayer = new Player(userName, socket.to(this._townID));
        this._players.push(newPlayer);
        this._connectedSockets.add(socket);
        newPlayer.videoToken = await this._videoClient.getTokenForTown(this._townID, newPlayer.id);
        this._broadcastEmitter.emit('playerJoined', newPlayer.toPlayerModel());
        socket.on('disconnect', () => {
            this._removePlayer(newPlayer);
            this._connectedSockets.delete(socket);
        });
        socket.on('chatMessage', (message) => {
            this._broadcastEmitter.emit('chatMessage', message);
            this._chatMessages.push(message);
            if (this._chatMessages.length > 200) {
                this._chatMessages.shift();
            }
        });
        socket.on('playerMovement', (movementData) => {
            try {
                this._updatePlayerLocation(newPlayer, movementData);
            }
            catch (err) {
                logError(err);
            }
        });
        socket.on('interactableUpdate', (update) => {
            if (isViewingArea(update)) {
                newPlayer.townEmitter.emit('interactableUpdate', update);
                const viewingArea = this._interactables.find(eachInteractable => eachInteractable.id === update.id);
                if (viewingArea) {
                    viewingArea.updateModel(update);
                }
            }
        });
        socket.on('interactableCommand', (command) => {
            const interactable = this._interactables.find(eachInteractable => eachInteractable.id === command.interactableID);
            if (interactable) {
                try {
                    const payload = interactable.handleCommand(command, newPlayer);
                    socket.emit('commandResponse', {
                        commandID: command.commandID,
                        interactableID: command.interactableID,
                        isOK: true,
                        payload,
                    });
                }
                catch (err) {
                    if (err instanceof InvalidParametersError) {
                        socket.emit('commandResponse', {
                            commandID: command.commandID,
                            interactableID: command.interactableID,
                            isOK: false,
                            error: err.message,
                        });
                    }
                    else {
                        logError(err);
                        socket.emit('commandResponse', {
                            commandID: command.commandID,
                            interactableID: command.interactableID,
                            isOK: false,
                            error: 'Unknown error',
                        });
                    }
                }
            }
            else {
                socket.emit('commandResponse', {
                    commandID: command.commandID,
                    interactableID: command.interactableID,
                    isOK: false,
                    error: `No such interactable ${command.interactableID}`,
                });
            }
        });
        return newPlayer;
    }
    _removePlayer(player) {
        if (player.location.interactableID) {
            this._removePlayerFromInteractable(player);
        }
        this._players = this._players.filter(p => p.id !== player.id);
        this._broadcastEmitter.emit('playerDisconnect', player.toPlayerModel());
    }
    _updatePlayerLocation(player, location) {
        const prevInteractable = this._interactables.find(conv => conv.id === player.location.interactableID);
        if (!prevInteractable?.contains(location)) {
            if (prevInteractable) {
                prevInteractable.remove(player);
            }
            const newInteractable = this._interactables.find(eachArea => eachArea.isActive && eachArea.contains(location));
            if (newInteractable) {
                newInteractable.add(player);
            }
            location.interactableID = newInteractable?.id;
        }
        else {
            location.interactableID = prevInteractable.id;
        }
        player.location = location;
        this._broadcastEmitter.emit('playerMoved', player.toPlayerModel());
    }
    _removePlayerFromInteractable(player) {
        const area = this._interactables.find(eachArea => eachArea.id === player.location.interactableID);
        if (area) {
            area.remove(player);
        }
    }
    addConversationArea(conversationArea) {
        const area = this._interactables.find(eachArea => eachArea.id === conversationArea.id);
        if (!area || !conversationArea.topic || area.topic) {
            return false;
        }
        area.topic = conversationArea.topic;
        area.addPlayersWithinBounds(this._players);
        this._broadcastEmitter.emit('interactableUpdate', area.toModel());
        return true;
    }
    addViewingArea(viewingArea) {
        const area = this._interactables.find(eachArea => eachArea.id === viewingArea.id);
        if (!area || !viewingArea.video || area.video) {
            return false;
        }
        area.updateModel(viewingArea);
        area.addPlayersWithinBounds(this._players);
        this._broadcastEmitter.emit('interactableUpdate', area.toModel());
        return true;
    }
    getPlayerBySessionToken(token) {
        return this.players.find(eachPlayer => eachPlayer.sessionToken === token);
    }
    getInteractable(id) {
        const ret = this._interactables.find(eachInteractable => eachInteractable.id === id);
        if (!ret) {
            throw new Error(`No such interactable ${id}`);
        }
        return ret;
    }
    getChatMessages(interactableID) {
        return this._chatMessages.filter(eachMessage => eachMessage.interactableID === interactableID);
    }
    disconnectAllPlayers() {
        this._broadcastEmitter.emit('townClosing');
        this._connectedSockets.forEach(eachSocket => eachSocket.disconnect(true));
    }
    initializeFromMap(map) {
        const objectLayer = map.layers.find(eachLayer => eachLayer.name === 'Objects');
        if (!objectLayer) {
            throw new Error(`Unable to find objects layer in map`);
        }
        const viewingAreas = objectLayer.objects
            .filter(eachObject => eachObject.type === 'ViewingArea')
            .map(eachViewingAreaObject => ViewingArea.fromMapObject(eachViewingAreaObject, this._broadcastEmitter));
        const conversationAreas = objectLayer.objects
            .filter(eachObject => eachObject.type === 'ConversationArea')
            .map(eachConvAreaObj => ConversationArea.fromMapObject(eachConvAreaObj, this._broadcastEmitter));
        const gameAreas = objectLayer.objects
            .filter(eachObject => eachObject.type === 'GameArea')
            .map(eachGameAreaObj => GameAreaFactory(eachGameAreaObj, this._broadcastEmitter));
        this._interactables = this._interactables
            .concat(viewingAreas)
            .concat(conversationAreas)
            .concat(gameAreas);
        this._validateInteractables();
    }
    _validateInteractables() {
        const interactableIDs = this._interactables.map(eachInteractable => eachInteractable.id);
        if (interactableIDs.some(item => interactableIDs.indexOf(item) !== interactableIDs.lastIndexOf(item))) {
            throw new Error(`Expected all interactable IDs to be unique, but found duplicate interactable ID in ${interactableIDs}`);
        }
        for (const interactable of this._interactables) {
            for (const otherInteractable of this._interactables) {
                if (interactable !== otherInteractable && interactable.overlaps(otherInteractable)) {
                    throw new Error(`Expected interactables not to overlap, but found overlap between ${interactable.id} and ${otherInteractable.id}`);
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG93bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90b3duL1Rvd24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUVoQyxPQUFPLHNCQUFzQixNQUFNLCtCQUErQixDQUFDO0FBRW5FLE9BQU8sTUFBTSxNQUFNLGVBQWUsQ0FBQztBQUNuQyxPQUFPLFdBQVcsTUFBTSxvQkFBb0IsQ0FBQztBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBYTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDcEMsT0FBTyxnQkFBZ0IsTUFBTSxvQkFBb0IsQ0FBQztBQUNsRCxPQUFPLGVBQWUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxPQUFPLFdBQVcsTUFBTSxlQUFlLENBQUM7QUFNeEMsTUFBTSxDQUFDLE9BQU8sT0FBTyxJQUFJO0lBQ3ZCLElBQUksUUFBUTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRUQsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFjO1FBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEYsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQ2hDLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNwQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxPQUFPLENB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