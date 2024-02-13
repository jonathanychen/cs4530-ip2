import InvalidParametersError from '../lib/InvalidParametersError';
import InteractableArea from './InteractableArea';
export default class ViewingArea extends InteractableArea {
    _video;
    _isPlaying;
    _elapsedTimeSec;
    get video() {
        return this._video;
    }
    get elapsedTimeSec() {
        return this._elapsedTimeSec;
    }
    get isPlaying() {
        return this._isPlaying;
    }
    constructor({ id, isPlaying, elapsedTimeSec: progress, video }, coordinates, townEmitter) {
        super(id, coordinates, townEmitter);
        this._video = video;
        this._elapsedTimeSec = progress;
        this._isPlaying = isPlaying;
    }
    remove(player) {
        super.remove(player);
        if (this._occupants.length === 0) {
            this._video = undefined;
            this._emitAreaChanged();
        }
    }
    updateModel({ isPlaying, elapsedTimeSec: progress, video }) {
        this._video = video;
        this._isPlaying = isPlaying;
        this._elapsedTimeSec = progress;
    }
    toModel() {
        return {
            id: this.id,
            video: this._video,
            isPlaying: this._isPlaying,
            elapsedTimeSec: this._elapsedTimeSec,
            occupants: this.occupantsByID,
            type: 'ViewingArea',
        };
    }
    static fromMapObject(mapObject, townEmitter) {
        const { name, width, height } = mapObject;
        if (!width || !height) {
            throw new Error(`Malformed viewing area ${name}`);
        }
        const rect = { x: mapObject.x, y: mapObject.y, width, height };
        return new ViewingArea({ isPlaying: false, id: name, elapsedTimeSec: 0, occupants: [] }, rect, townEmitter);
    }
    handleCommand(command) {
        if (command.type === 'ViewingAreaUpdate') {
            const viewingArea = command;
            this.updateModel(viewingArea.update);
            return {};
        }
        throw new InvalidParametersError('Unknown command type');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld2luZ0FyZWEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdG93bi9WaWV3aW5nQXJlYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLHNCQUFzQixNQUFNLCtCQUErQixDQUFDO0FBV25FLE9BQU8sZ0JBQWdCLE1BQU0sb0JBQW9CLENBQUM7QUFFbEQsTUFBTSxDQUFDLE9BQU8sT0FBTyxXQUFZLFNBQVEsZ0JBQWdCO0lBQy9DLE1BQU0sQ0FBVTtJQUVoQixVQUFVLENBQVU7SUFFcEIsZUFBZSxDQUFTO0lBRWhDLElBQVcsS0FBSztRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBVyxjQUFjO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBVyxTQUFTO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBU0QsWUFDRSxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQWtDLEVBQ2xGLFdBQXdCLEVBQ3hCLFdBQXdCO1FBRXhCLEtBQUssQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO0lBQzlCLENBQUM7SUFVTSxNQUFNLENBQUMsTUFBYztRQUMxQixLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7WUFDeEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDMUIsQ0FBQztJQUNILENBQUM7SUFPTSxXQUFXLENBQUMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQW9CO1FBQ2pGLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO1FBQzVCLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDO0lBQ2xDLENBQUM7SUFNTSxPQUFPO1FBQ1osT0FBTztZQUNMLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNsQixTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDMUIsY0FBYyxFQUFFLElBQUksQ0FBQyxlQUFlO1lBQ3BDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYTtZQUM3QixJQUFJLEVBQUUsYUFBYTtTQUNwQixDQUFDO0lBQ0osQ0FBQztJQVFNLE1BQU0sQ0FBQyxhQUFhLENBQUMsU0FBMEIsRUFBRSxXQUF3QjtRQUM5RSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFDMUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLElBQUksRUFBRSxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUNELE1BQU0sSUFBSSxHQUFnQixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUM1RSxPQUFPLElBQUksV0FBVyxDQUNwQixFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQXNCLEVBQUUsY0FBYyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQ2xGLElBQUksRUFDSixXQUFXLENBQ1osQ0FBQztJQUNKLENBQUM7SUFFTSxhQUFhLENBQ2xCLE9BQW9CO1FBRXBCLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sV0FBVyxHQUFHLE9BQW1DLENBQUM7WUFDeEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsT0FBTyxFQUFnRCxDQUFDO1FBQzFELENBQUM7UUFDRCxNQUFNLElBQUksc0JBQXNCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0YifQ==