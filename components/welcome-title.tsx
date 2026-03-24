type WelcomeTitleProps = {
  text: string;
};

export default function WelcomeTitle({ text }: WelcomeTitleProps) {
  return <h1 className="text-4xl font-bold tracking-tight">{text}</h1>;
}
