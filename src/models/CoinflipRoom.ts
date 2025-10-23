import { Column, DataType, Model, Table } from "sequelize-typescript";
import { ECoinflipStatus, ECurrency } from "../helpers/Enums";

@Table({
    tableName: "coinflip_rooms",
    timestamps: true,
    paranoid: true,
})
class CoinflipRoom extends Model<CoinflipRoom> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare status: ECoinflipStatus;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare currency: ECurrency;

    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare endTime: Date;
}

export default CoinflipRoom;
