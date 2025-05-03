import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {InstructorPageComponent} from './instructor-page/instructor-page.component';
import { UserLoginComponent } from './user-login/user-login.component';
import { AdminLoginComponent } from './admin-login/admin-login.component';
import { LoginComponent } from './login/login.component';
import { CreateCourseComponent } from './create-course/create-course.component';
import { CreateAssessmentComponent } from './create-assessment/create-assessment.component';
import { ViewCoursesComponent } from './view-courses/view-courses.component';
import { EditCourseComponent } from './edit-course/edit-course.component';
import { RegisterComponent } from './register/register.component';
import { UserPageComponent } from './user-page/user-page.component';
import { AdminPageComponent } from './admin-page/admin-page.component';
import { ViewAssessmentsComponent } from './view-assessments/view-assessments.component';
import { ExamPageComponent } from './exam-page/exam-page.component';
import { ProfileComponent } from './profile/profile.component';
import { ViewStudentMarklistComponent } from './view-student-marklist/view-student-marklist.component';
import { AssessmentDetailComponent } from './assessment-detail/assessment-detail.component';
import { EditAssessmentComponent } from './edit-assessment/edit-assessment.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'user-login', component: UserLoginComponent },
  {path: 'instructor-page', component: InstructorPageComponent},
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'view-courses', component: ViewCoursesComponent },
  { path: 'create-course', component: CreateCourseComponent },
  { path: 'create-assessment', component: CreateAssessmentComponent },
  { path: 'view-assessments', component: ViewAssessmentsComponent },
  { path: 'edit-course/:id', component: EditCourseComponent },
  { path: 'view-student-marklist/:courseId', component: ViewStudentMarklistComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'user-page', component: UserPageComponent },
  {path: 'admin-page', component: AdminPageComponent},
  { path: 'exam', component: ExamPageComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'edit-assessment/:id', component: EditAssessmentComponent },
  { path: 'assessment-detail/:id', component: AssessmentDetailComponent },
  { path: '**', redirectTo: '' }
];
