export type User = {
  id: number;
  username: string;
  email: string;
};

export type LoginPayload = {
  username: string;
  password: string;
  remember_me?: boolean;
};

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
};
