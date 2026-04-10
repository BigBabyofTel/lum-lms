import Image from 'next/image';

interface PortalProps {
  role: string;
  setRole: (role: 'teacher' | 'parent' | 'student' | '') => void;
  setMode: (mode: 'chooser' | 'login' | 'register') => void;
}

export default function Portal(props: PortalProps) {
  return (
    <div className="w-full flex flex-row items-center justify-around">
      <div
        role="button"
        onClick={() => {
          props.setMode('login');
          props.setRole('teacher');
        }}
        className="ww-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
      >
        <span className="mt-5">Staff</span>
        <Image
          src="/teacher.webp"
          width={100}
          height={100}
          alt="an icon representing teachers"
        />
      </div>
      <div
        className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
        role="button"
        onClick={() => {
          props.setMode('login');
          props.setRole('parent');
        }}
      >
        <span className="mt-5">Parent</span>
        <Image
          src="/parent.webp"
          width={70}
          height={70}
          style={{ height: 'auto', width: 'auto' }}
          loading="eager"
          alt="icon representing parents"
        />
      </div>
      <div
        className="w-1/4 h-full bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-lg text-center flex flex-col justify-between items-center opacity-100"
        role="button"
        onClick={() => {
          props.setMode('login');
          props.setRole('student');
        }}
      >
        <span className="mt-5">Student</span>
        <Image
          src="/student.webp"
          width={100}
          height={100}
          alt="an icon representing students"
        />
      </div>
    </div>
  );
}
