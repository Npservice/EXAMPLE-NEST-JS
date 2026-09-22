import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FileStatus = 'public' | 'private';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name_file' })
  nameFile: string;

  @Column()
  path: string;

  @Column({ nullable: true })
  ext: string;

  @Column({ nullable: true })
  size: string;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({ name: 'is_temp', type: 'tinyint', default: 1 })
  isTemp: number;

  @Column({ type: 'enum', enum: ['public', 'private'], default: 'private' })
  status: FileStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
