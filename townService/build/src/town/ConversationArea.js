import InvalidParametersError from '../lib/InvalidParametersError';
import InteractableArea from './InteractableArea';
export default class ConversationArea extends InteractableArea {
    topic;
    get isActive() {
        return this._occupants.length > 0;
    }
    constructor({ topic, id }, coordinates, townEmitter) {
        super(id, coordinates, townEmitter);
        this.topic = topic;
    }
    remove(player) {
        super.remove(player);
        if (this._occupants.length === 0) {
            this.topic = undefined;
            this._emitAreaChanged();
        }
    }
    toModel() {
        return {
            id: this.id,
            occupants: this.occupantsByID,
            topic: this.topic,
            type: 'ConversationArea',
        };
    }
    static fromMapObject(mapObject, broadcastEmitter) {
        const { name, width, height } = mapObject;
        if (!width || !height) {
            throw new Error(`Malformed viewing area ${name}`);
        }
        const rect = { x: mapObject.x, y: mapObject.y, width, height };
        return new ConversationArea({ id: name, occupants: [] }, rect, broadcastEmitter);
    }
    handleCommand() {
        throw new InvalidParametersError('Unknown command type');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udmVyc2F0aW9uQXJlYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90b3duL0NvbnZlcnNhdGlvbkFyZWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxzQkFBc0IsTUFBTSwrQkFBK0IsQ0FBQztBQVNuRSxPQUFPLGdCQUFnQixNQUFNLG9CQUFvQixDQUFDO0FBRWxELE1BQU0sQ0FBQyxPQUFPLE9BQU8sZ0JBQWlCLFNBQVEsZ0JBQWdCO0lBRXJELEtBQUssQ0FBVTtJQUd0QixJQUFXLFFBQVE7UUFDakIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQVNELFlBQ0UsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUF1QyxFQUNsRCxXQUF3QixFQUN4QixXQUF3QjtRQUV4QixLQUFLLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNyQixDQUFDO0lBVU0sTUFBTSxDQUFDLE1BQWM7UUFDMUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzFCLENBQUM7SUFDSCxDQUFDO0lBTU0sT0FBTztRQUNaLE9BQU87WUFDTCxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDWCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLElBQUksRUFBRSxrQkFBa0I7U0FDekIsQ0FBQztJQUNKLENBQUM7SUFRTSxNQUFNLENBQUMsYUFBYSxDQUN6QixTQUEwQixFQUMxQixnQkFBNkI7UUFFN0IsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQzFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUM7UUFDRCxNQUFNLElBQUksR0FBZ0IsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDNUUsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDbkYsQ0FBQztJQUVNLGFBQWE7UUFHbEIsTUFBTSxJQUFJLHNCQUFzQixDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNGIn0=