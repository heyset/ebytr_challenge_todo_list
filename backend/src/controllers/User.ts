import { User } from '@models';
import { validate } from '@validation';
import { getTokenPair, refreshTokenPair, revoke } from '@token';
import { compare, hash } from '@crypto';
import { ValidationError } from '@errors';

const mapPrivateInfo = ({ email, username }: Record<string, unknown>) => (
  { email, username }
);

const create = (userData: any) => {
  validate('createUser', userData);

  return hash(userData.password)
    .then((hashedPassword) => User.insertOne({
      ...userData,
      password: hashedPassword,
    }))
    .then(() => {
      const { username } = userData;
      const tokens = getTokenPair({ username });
      return { ...tokens };
    });
};

const getByUsername = (username: string) => User.getByUsername(username)
  .then((user) => mapPrivateInfo(user));

const login = (userData: any) => {
  validate('loginUser', userData);

  const { email, username, password } = userData;

  const getUser = () => (email ? User.getByEmail(email) : User.getByUsername(username));

  return getUser()
    .then((user) => Promise.all([Promise.resolve(user), compare(password, user.password)]))
    .then(([user]) => {
      const tokens = getTokenPair({ username: user.username });
      return { ...tokens };
    });
};

const logout = (authorization: string | undefined) => {
  if (!authorization) return Promise.resolve('refresh');

  try {
    const token = authorization.replace('Bearer ', '');
    return revoke(token);
  } catch {
    // does not matter if token is invalid
    return Promise.resolve('refresh');
  }
};

const refresh = (authorization: string | undefined) => {
  if (!authorization) throw new ValidationError('Invalid token.');

  const token = authorization.replace('Bearer ', '');

  try {
    return refreshTokenPair(token);
  } catch (err) {
    return Promise.reject(err);
  }
};

export default {
  create,
  getByUsername,
  login,
  logout,
  refresh,
};
