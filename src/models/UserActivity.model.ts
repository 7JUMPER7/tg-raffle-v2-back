import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";
import { EActivityType } from "../helpers/Enums";

@Table({
    tableName: "user_activities",
    timestamps: true,
    paranoid: true,
})
class UserActivity extends Model<UserActivity> {
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
    declare type: EActivityType;

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

export default UserActivity;
