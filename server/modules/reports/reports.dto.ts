import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  targetId!: string;

  @IsIn(['post', 'comment'])
  targetType!: 'post' | 'comment';

  @IsIn(['spam', 'abuse', 'ad', 'other'])
  reason!: 'spam' | 'abuse' | 'ad' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class HandleReportDto {
  @IsIn(['delete_content', 'mute_user', 'ignore'])
  action!: 'delete_content' | 'mute_user' | 'ignore';
}
