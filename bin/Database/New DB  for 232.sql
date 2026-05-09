USE [AttendanceDB]
GO

-- ลบ table เก่าทั้งหมด (เรียงจาก child → parent)
IF OBJECT_ID('dbo.Leave_Requests',      'U') IS NOT NULL DROP TABLE [dbo].[Leave_Requests]
IF OBJECT_ID('dbo.Attendance',          'U') IS NOT NULL DROP TABLE [dbo].[Attendance]
IF OBJECT_ID('dbo.sessions',            'U') IS NOT NULL DROP TABLE [dbo].[sessions]
IF OBJECT_ID('dbo.Student_Enrollments', 'U') IS NOT NULL DROP TABLE [dbo].[Student_Enrollments]
IF OBJECT_ID('dbo.Teacher_Subjects',    'U') IS NOT NULL DROP TABLE [dbo].[Teacher_Subjects]
IF OBJECT_ID('dbo.Subjects',            'U') IS NOT NULL DROP TABLE [dbo].[Subjects]
IF OBJECT_ID('dbo.Teachers',            'U') IS NOT NULL DROP TABLE [dbo].[Teachers]
IF OBJECT_ID('dbo.Students',            'U') IS NOT NULL DROP TABLE [dbo].[Students]
IF OBJECT_ID('dbo.users',               'U') IS NOT NULL DROP TABLE [dbo].[users]
IF OBJECT_ID('dbo.Classes',             'U') IS NOT NULL DROP TABLE [dbo].[Classes]
IF OBJECT_ID('dbo.Face_Verification',   'U') IS NOT NULL DROP TABLE [dbo].[Face_Verification]
GO

-- ================================================================
-- 1. USERS
-- ================================================================
CREATE TABLE [dbo].[users] (
    [id]         INT           IDENTITY(1,1) NOT NULL,
    [username]   NVARCHAR(20)  NOT NULL,
    [full_name]  NVARCHAR(100) NULL,
    [email]      NVARCHAR(100) NULL,
    [role]       NVARCHAR(20)  NOT NULL DEFAULT 'Student',
    [password]   NVARCHAR(255) NULL,
    [created_at] DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_username UNIQUE (username),
    CONSTRAINT CHK_users_role CHECK (role IN ('Student', 'Staff'))
)
GO

-- ================================================================
-- 2. STUDENTS
-- ================================================================
CREATE TABLE [dbo].[Students] (
    [student_id]        NVARCHAR(20)  NOT NULL,
    [student_name]      NVARCHAR(100) NOT NULL,
    [email]             NVARCHAR(100) NULL,
    [profile_image_url] NVARCHAR(255) NULL,
    [created_at]        DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Students PRIMARY KEY (student_id),
    CONSTRAINT FK_Students_users FOREIGN KEY (student_id) REFERENCES [dbo].[users](username)
)
GO

-- ================================================================
-- 3. TEACHERS
-- ================================================================
CREATE TABLE [dbo].[Teachers] (
    [teacher_id]  NVARCHAR(20)  NOT NULL,
    [full_name]   NVARCHAR(100) NOT NULL,
    [email]       NVARCHAR(100) NULL,
    [department]  NVARCHAR(100) NULL,
    [created_at]  DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Teachers PRIMARY KEY (teacher_id),
    CONSTRAINT FK_Teachers_users FOREIGN KEY (teacher_id) REFERENCES [dbo].[users](username)
)
GO

-- ================================================================
-- 4. SUBJECTS
-- ================================================================
CREATE TABLE [dbo].[Subjects] (
    [subject_code] VARCHAR(20)   NOT NULL,
    [subject_name] NVARCHAR(100) NOT NULL,
    [credits]      INT           NULL,
    CONSTRAINT PK_Subjects PRIMARY KEY (subject_code)
)
GO

-- ================================================================
-- 5. TEACHER_SUBJECTS
-- ================================================================
CREATE TABLE [dbo].[Teacher_Subjects] (
    [id]           INT          IDENTITY(1,1) NOT NULL,
    [teacher_id]   NVARCHAR(20) NOT NULL,
    [subject_code] VARCHAR(20)  NOT NULL,
    [semester]     NVARCHAR(20) NULL,
    [section]      INT          NULL,
    CONSTRAINT PK_Teacher_Subjects PRIMARY KEY (id),
    CONSTRAINT UQ_Teacher_Subject UNIQUE (teacher_id, subject_code, semester, section),
    CONSTRAINT FK_TS_Teachers FOREIGN KEY (teacher_id) REFERENCES [dbo].[Teachers](teacher_id),
    CONSTRAINT FK_TS_Subjects FOREIGN KEY (subject_code) REFERENCES [dbo].[Subjects](subject_code)
)
GO

-- ================================================================
-- 6. STUDENT_ENROLLMENTS
-- ================================================================
CREATE TABLE [dbo].[Student_Enrollments] (
    [id]           INT          IDENTITY(1,1) NOT NULL,
    [student_id]   NVARCHAR(20) NOT NULL,
    [subject_code] VARCHAR(20)  NOT NULL,
    [semester]     NVARCHAR(20) NULL,
    [section]      INT          NULL,
    CONSTRAINT PK_Student_Enrollments PRIMARY KEY (id),
    CONSTRAINT UQ_Enrollment UNIQUE (student_id, subject_code, semester, section),
    CONSTRAINT FK_SE_Students FOREIGN KEY (student_id) REFERENCES [dbo].[Students](student_id),
    CONSTRAINT FK_SE_Subjects FOREIGN KEY (subject_code) REFERENCES [dbo].[Subjects](subject_code)
)
GO

-- ================================================================
-- 7. SESSIONS
-- ================================================================
CREATE TABLE [dbo].[sessions] (
    [id]               BIGINT        IDENTITY(1,1) NOT NULL,
    [session_code]     NVARCHAR(50)  NOT NULL,
    [subject]          VARCHAR(20)   NULL,
    [room]             NVARCHAR(50)  NULL,
    [teacher_username] NVARCHAR(20)  NULL,
    [started_at]       DATETIME      NULL,
    [expires_at]       DATETIME      NULL,
    [active]           BIT           NOT NULL DEFAULT 1,
    [latitude]         DECIMAL(10,8) NULL,
    [longitude]        DECIMAL(11,8) NULL,
    [radius_meter]     DECIMAL(10,2) NULL DEFAULT 100,
    CONSTRAINT PK_sessions PRIMARY KEY (id),
    CONSTRAINT UQ_sessions_code UNIQUE (session_code),
    CONSTRAINT FK_sessions_teacher FOREIGN KEY (teacher_username) REFERENCES [dbo].[users](username)
)
GO

-- ================================================================
-- 8. ATTENDANCE
-- ================================================================
CREATE TABLE [dbo].[Attendance] (
    [id]              BIGINT        IDENTITY(1,1) NOT NULL,
    [student_id]      NVARCHAR(20)  NOT NULL,
    [session_id]      BIGINT        NOT NULL,
    [check_in_date]   DATETIME      NOT NULL DEFAULT GETDATE(),
    [status]          NVARCHAR(10)  NOT NULL DEFAULT N'มา',
    [latitude]        DECIMAL(10,8) NULL,
    [longitude]       DECIMAL(11,8) NULL,
    [ip_address]      NVARCHAR(50)  NULL,
    [photo_url]       NVARCHAR(255) NULL,
    [face_verified]   BIT           NOT NULL DEFAULT 0,
    [face_similarity] DECIMAL(5,2)  NULL,
    CONSTRAINT PK_Attendance PRIMARY KEY (id),
    CONSTRAINT UQ_Attendance_Student_Session UNIQUE (student_id, session_id),
    CONSTRAINT FK_Attendance_Students FOREIGN KEY (student_id) REFERENCES [dbo].[Students](student_id),
    CONSTRAINT FK_Attendance_Sessions FOREIGN KEY (session_id) REFERENCES [dbo].[sessions](id),
    CONSTRAINT CHK_Attendance_Status CHECK (status IN (N'มา', N'สาย', N'ขาด', N'ลา'))
)
GO

-- ================================================================
-- 9. LEAVE_REQUESTS
-- ================================================================
CREATE TABLE [dbo].[Leave_Requests] (
    [id]           BIGINT        IDENTITY(1,1) NOT NULL,
    [student_id]   NVARCHAR(20)  NOT NULL,
    [student_name] NVARCHAR(100) NULL,
    [subject]      VARCHAR(20)   NULL,
    [leave_date]   DATE          NOT NULL,
    [type]         NVARCHAR(20)  NOT NULL DEFAULT N'ป่วย',
    [leave_reason] NVARCHAR(MAX) NULL,
    [document_url] NVARCHAR(255) NULL,
    [has_file]     BIT           NOT NULL DEFAULT 0,
    [status]       NVARCHAR(20)  NOT NULL DEFAULT 'pending',
    [submitted_at] DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Leave_Requests PRIMARY KEY (id),
    CONSTRAINT FK_LR_Students FOREIGN KEY (student_id) REFERENCES [dbo].[Students](student_id),
    CONSTRAINT CHK_Leave_Type CHECK (type IN (N'ป่วย', N'กิจ', N'อื่นๆ')),
    CONSTRAINT CHK_Leave_Status CHECK (status IN ('pending', 'approved', 'rejected'))
)
GO

-- ================================================================
-- ข้อมูลทดสอบ
-- ================================================================
INSERT INTO [dbo].[users] (username, full_name, email, role, password) VALUES
    ('admin',    N'ผู้ดูแลระบบ',   'admin@tu.ac.th',    'Staff',   '123456'),
    ('teacher1', N'อาจารย์ทดสอบ',  'teacher1@tu.ac.th', 'Staff',   '123456'),
    ('6501234',  N'นักศึกษาทดสอบ', '6501234@tu.ac.th',  'Student', '123456')
GO

INSERT INTO [dbo].[Teachers] (teacher_id, full_name, email, department) VALUES
    ('teacher1', N'อาจารย์ทดสอบ', 'teacher1@tu.ac.th', N'วิทยาการคอมพิวเตอร์')
GO

INSERT INTO [dbo].[Students] (student_id, student_name, email) VALUES
    ('6501234', N'นักศึกษาทดสอบ', '6501234@tu.ac.th')
GO

INSERT INTO [dbo].[Subjects] (subject_code, subject_name, credits) VALUES
    ('CS232', N'Object-Oriented Programming', 3),
    ('CS301', N'Data Structures', 3)
GO

INSERT INTO [dbo].[Teacher_Subjects] (teacher_id, subject_code, semester, section) VALUES
    ('teacher1', 'CS232', '2/2567', 1),
    ('teacher1', 'CS301', '2/2567', 1)
GO

INSERT INTO [dbo].[Student_Enrollments] (student_id, subject_code, semester, section) VALUES
    ('6501234', 'CS232', '2/2567', 1)
GO