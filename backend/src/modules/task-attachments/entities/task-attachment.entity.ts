import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {
  TaskEntity,
} from '../../tasks/entities/task.entity';

import {
  TaskAssignmentEntity,
} from '../../task-assignments/entities/task-assignment.entity';

import {
  UserEntity,
} from '../../users/entities/user.entity';

import {
  AttachmentStorageType,
} from '../../../shared/enums/attachment-storage-type.enum';


@Entity(
  'task_attachments',
)
@Check(
  `(
    task_id IS NOT NULL
    AND assignment_id IS NULL
  )
  OR
  (
    task_id IS NULL
    AND assignment_id IS NOT NULL
  )`,
)
export class TaskAttachmentEntity {
  @PrimaryGeneratedColumn(
    'uuid',
  )
  id!:
    string;


  @Column({
    name:
      'task_id',

    type:
      'varchar',

    length:
      36,

    nullable:
      true,
  })
  taskId?:
    string;


  @ManyToOne(
    () =>
      TaskEntity,

    (
      task,
    ) =>
      task.attachments,

    {
      nullable:
        true,
    },
  )
  @JoinColumn({
    name:
      'task_id',
  })
  task?:
    TaskEntity;


  @Column({
    name:
      'assignment_id',

    type:
      'varchar',

    length:
      36,

    nullable:
      true,
  })
  assignmentId?:
    string;


  @ManyToOne(
    () =>
      TaskAssignmentEntity,

    (
      assignment,
    ) =>
      assignment.attachments,

    {
      nullable:
        true,
    },
  )
  @JoinColumn({
    name:
      'assignment_id',
  })
  assignment?:
    TaskAssignmentEntity;


  @Column({
    name:
      'uploaded_by',

    type:
      'varchar',

    length:
      36,
  })
  uploadedById!:
    string;


  @ManyToOne(
    () =>
      UserEntity,
  )
  @JoinColumn({
    name:
      'uploaded_by',
  })
  uploadedBy!:
    UserEntity;


  @Column({
    name:
      'file_name',

    type:
      'varchar',

    length:
      255,
  })
  fileName!:
    string;


  @Column({
    name:
      'mime_type',

    type:
      'varchar',

    length:
      100,
  })
  mimeType!:
    string;


  @Column({
    name:
      'file_size',

    type:
      'bigint',
  })
  fileSize!:
    number;


  @Column({
    name:
      'storage_type',

    type:
      'enum',

    enum:
      AttachmentStorageType,

    default:
      AttachmentStorageType.IMAGE,
  })
  storageType!:
    AttachmentStorageType;


  @Column({
    name:
      'file_url',

    type:
      'varchar',

    length:
      500,

    nullable:
      true,
  })
  fileUrl?:
    string | null;


  @Column({
    name:
      'file_data',

    type:
      'longblob',

    nullable:
      true,

    select:
      false,
  })
  fileData?:
    Buffer | null;


  @CreateDateColumn({
    name:
      'created_at',

    type:
      'timestamp',
  })
  createdAt!:
    Date;


  @Column({
    name:
      'deleted_at',

    type:
      'timestamp',

    nullable:
      true,
  })
  deletedAt?:
    Date;
}