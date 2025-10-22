import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";

@Table({
    tableName: "ton_deposits",
    timestamps: true,
    paranoid: true,
})
class TonDeposit extends Model<TonDeposit> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare hash: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare srcWallet: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare comment: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
    })
    declare amount: number;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare userId: string | null;
    @BelongsTo(() => User, { onDelete: "SET NULL" })
    declare user: User | null;
}

export default TonDeposit;
