import { nanoid } from 'nanoid';
export default class Game {
    _state;
    id;
    _result;
    _players = [];
    constructor(initialState) {
        this.id = nanoid();
        this._state = initialState;
    }
    get state() {
        return this._state;
    }
    set state(newState) {
        this._state = newState;
    }
    join(player) {
        this._join(player);
        this._players.push(player);
    }
    leave(player) {
        this._leave(player);
        this._players = this._players.filter(p => p.id !== player.id);
    }
    toModel() {
        return {
            state: this._state,
            id: this.id,
            result: this._result,
            players: this._players.map(player => player.id),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2FtZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy90b3duL2dhbWVzL0dhbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQWNoQyxNQUFNLENBQUMsT0FBTyxPQUFnQixJQUFJO0lBQ3hCLE1BQU0sQ0FBWTtJQUVWLEVBQUUsQ0FBaUI7SUFFekIsT0FBTyxDQUFjO0lBRXJCLFFBQVEsR0FBYSxFQUFFLENBQUM7SUFPbEMsWUFBbUIsWUFBdUI7UUFDeEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxNQUFNLEVBQW9CLENBQUM7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7SUFDN0IsQ0FBQztJQUVELElBQVcsS0FBSztRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBYyxLQUFLLENBQUMsUUFBbUI7UUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7SUFDekIsQ0FBQztJQStCTSxJQUFJLENBQUMsTUFBYztRQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFPTSxLQUFLLENBQUMsTUFBYztRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNoRSxDQUFDO0lBRU0sT0FBTztRQUNaLE9BQU87WUFDTCxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbEIsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3BCLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7U0FDaEQsQ0FBQztJQUNKLENBQUM7Q0FDRiJ9