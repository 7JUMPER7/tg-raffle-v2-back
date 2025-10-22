import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";

@Table({
    tableName: "gifts",
    timestamps: true,
    paranoid: true,
})
class Gift extends Model<Gift> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
    })
    declare userId: string | null;
    @BelongsTo(() => User, { onDelete: "SET NULL" })
    declare user: User | null;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare isUsed: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    })
    declare isClaimed: boolean;

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
    })
    declare importUserTgId: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare importMsgId: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare slug: string;

    @Column({
        type: DataType.STRING,
    })
    declare image?: string;

    @Column({
        type: DataType.STRING,
        defaultValue: null,
    })
    declare backdropColor: string | null;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
    })
    declare ticketsPrice: number;

    @Column({
        type: DataType.DATE,
        allowNull: true,
        defaultValue: null,
    })
    declare withdrawnAt: Date | null;
}

export default Gift;
